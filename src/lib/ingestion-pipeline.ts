import { prisma } from "@/lib/prisma";
import {
  extractFactsFromCv,
  matchCriteriaToCv,
  suggestInterviewQuestions,
} from "@/lib/ai-extraction";

/**
 * Pipeline complet d'extraction IA pour une candidature donnée :
 * extraction factuelle -> rapprochement critères -> questions suggérées.
 */
export async function runIngestionPipeline(applicationId: string, cvText: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { job: { include: { criteria: true } } },
  });

  if (!application) {
    throw new Error(`Application introuvable : ${applicationId}`);
  }

  // --- 1. Extraction factuelle ---------------------------------------------
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

  // --- 2. Rapprochement critères --------------------------------------------
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

  // --- 3. Questions suggérées ------------------------------------------------
  const questions = await suggestInterviewQuestions(cvText, matches);
  await prisma.suggestedQuestion.createMany({
    data: questions.map((q) => ({
      applicationId,
      questionText: q.question_text,
      basedOn: q.based_on,
    })),
  });

  // --- 4. Passage au statut suivant du pipeline -------------------------------
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
}