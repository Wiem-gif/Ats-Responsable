import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  extractFactsFromCv,
  matchCriteriaToCv,
  suggestInterviewQuestions,
} from "@/lib/ai-extraction";

/**
 * POST /api/webhooks/extract
 * Appelé par le workflow n8n W1 après l'upload d'un CV.
 * Body attendu : { applicationId: string, cvText: string }
 *
 * Ce endpoint concentre toute la logique IA (les 3 appels distincts du
 * guide : extraction / matching / questions) pour rester testable et
 * versionné dans le code plutôt qu'éparpillé dans des noeuds n8n.
 * n8n reste responsable de l'orchestration temporelle (webhooks, délais,
 * emails), pas de la logique métier IA elle-même.
 */
export async function POST(req: NextRequest) {
  try {
    const { applicationId, cvText } = (await req.json()) as {
      applicationId: string;
      cvText: string;
    };

    if (!applicationId || !cvText) {
      return NextResponse.json({ error: "applicationId et cvText requis." }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: { include: { criteria: true } } },
    });

    if (!application) {
      return NextResponse.json({ error: "Application introuvable." }, { status: 404 });
    }

    // --- 1. Extraction factuelle -------------------------------------------
    const facts = await extractFactsFromCv(cvText);

    const extractionRows = Object.entries(facts).flatMap(([fieldName, value]) => {
      if (Array.isArray(value)) {
        return value.map((v: { value: string; quote: string }) => ({
          applicationId,
          fieldName,
          value: v.value ?? "",
          sourceQuote: v.quote ?? null,
        }));
      }
      const v = value as { value: string | null; quote: string | null };
      return [
        {
          applicationId,
          fieldName,
          value: v?.value ?? "",
          sourceQuote: v?.quote ?? null,
        },
      ];
    });

    await prisma.extraction.createMany({ data: extractionRows });

    // --- 2. Rapprochement critères ------------------------------------------
    const criteriaLabels = application.job.criteria.map((c) => c.label);
    const matches = await matchCriteriaToCv(cvText, criteriaLabels);

    for (const m of matches) {
      const criterion = application.job.criteria.find((c) => c.label === m.criterion);
      if (!criterion) continue;
      await prisma.criteriaMatch.create({
        data: {
          applicationId,
          criterionId: criterion.id,
          status: m.status,
          evidenceQuote: m.quote,
        },
      });
    }

    // --- 3. Questions suggérées ---------------------------------------------
    const questions = await suggestInterviewQuestions(cvText, matches);
    await prisma.suggestedQuestion.createMany({
      data: questions.map((q) => ({
        applicationId,
        questionText: q.question_text,
        basedOn: q.based_on,
      })),
    });

    // --- 4. Passage au statut suivant du pipeline ----------------------------
    await prisma.application.update({
      where: { id: applicationId },
      data: { stage: "SCREENING" },
    });

    await prisma.auditLog.create({
      data: {
        action: "extraction.completed",
        targetType: "Application",
        targetId: applicationId,
      },
    });

    return NextResponse.json({ status: "ok", applicationId });
  } catch (error) {
    console.error("Erreur webhook extraction :", error);
    return NextResponse.json({ error: "Erreur serveur lors de l'extraction IA." }, { status: 500 });
  }
}
