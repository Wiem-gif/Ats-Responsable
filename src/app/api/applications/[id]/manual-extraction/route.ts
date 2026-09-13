import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchCriteriaToCv, suggestInterviewQuestions } from "@/lib/ai-extraction";

/**
 * POST /api/applications/[id]/manual-extraction
 * Comble le cas limite "CV sans texte exploitable" : le recruteur saisit
 * les informations clés à la main (pas d'appel IA pour l'extraction
 * elle-même, puisqu'il n'y a pas de texte source à analyser).
 *
 * En revanche, une fois cette saisie faite, elle sert de texte de
 * substitution pour le rapprochement critères et les questions suggérées —
 * l'IA travaille alors sur une source réelle (les mots du recruteur),
 * jamais sur une supposition.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const fields = (await req.json()) as Record<string, string>;

    const rows = Object.entries(fields)
      .filter(([, value]) => value && value.trim().length > 0)
      .map(([fieldName, value]) => ({
        applicationId: params.id,
        fieldName,
        value: value.trim(),
        sourceQuote: null,
        correctedByRecruiter: true,
        correctedValue: value.trim(),
        correctedAt: new Date(),
      }));

    if (rows.length === 0) {
      return NextResponse.json({ error: "Aucun champ renseigné." }, { status: 400 });
    }

    await prisma.extraction.createMany({ data: rows });

    // --- Texte de substitution pour l'IA (rapprochement + questions) ---------
    const syntheticText = Object.entries(fields)
      .filter(([, value]) => value && value.trim().length > 0)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: { job: { include: { criteria: true } } },
    });

    if (application && application.job.criteria.length > 0) {
      const criteriaLabels = application.job.criteria.map((c) => c.label);
      const matches = await matchCriteriaToCv(syntheticText, criteriaLabels);

      for (const m of matches) {
        const criterion = application.job.criteria.find((c) => c.label === m.criterion);
        if (!criterion) continue;
        await prisma.criteriaMatch.create({
          data: {
            applicationId: params.id,
            criterionId: criterion.id,
            status: m.status,
            evidenceQuote: m.quote,
          },
        });
      }

      const questions = await suggestInterviewQuestions(syntheticText, matches);
      await prisma.suggestedQuestion.createMany({
        data: questions.map((q) => ({
          applicationId: params.id,
          questionText: q.question_text,
          basedOn: q.based_on,
        })),
      });
    }

    await prisma.application.update({
      where: { id: params.id },
      data: { stage: "SCREENING" },
    });

    await prisma.auditLog.create({
      data: {
        action: "extraction.manual_entry",
        targetType: "Application",
        targetId: params.id,
      },
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Erreur saisie manuelle :", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}