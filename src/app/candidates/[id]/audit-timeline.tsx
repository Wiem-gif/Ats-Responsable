import { prisma } from "@/lib/prisma";

const ACTION_LABELS: Record<string, string> = {
  "candidate.duplicate_detected": "Doublon détecté (non fusionné)",
  "cv.extraction_failed": "Extraction du CV échouée",
  "extraction.completed": "Extraction IA terminée",
  "extraction.corrected": "Extraction corrigée par le recruteur",
  "interview.scheduled": "Entretien planifié",
  "interview.declined": "Entretien décliné par le candidat",
  "interview.feedback_submitted": "Retour d'entretien enregistré",
  "application.stage_changed": "Étape du pipeline modifiée",
  "email.sent": "Email envoyé",
  "followup.draft_generated": "Brouillon de relance généré",
  "reminder.draft_generated": "Brouillon de rappel généré",
  "candidate.deletion_executed": "Données supprimées (RGPD)",
};

export default async function AuditTimeline({
  applicationId,
  candidateId,
  interviewIds,
  emailDraftIds,
}: {
  applicationId: string;
  candidateId: string;
  interviewIds: string[];
  emailDraftIds: string[];
}) {
  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { targetType: "Application", targetId: applicationId },
        { targetType: "Candidate", targetId: candidateId },
        ...(interviewIds.length > 0
          ? [{ targetType: "Interview", targetId: { in: interviewIds } }]
          : []),
        ...(emailDraftIds.length > 0
          ? [{ targetType: "EmailDraft", targetId: { in: emailDraftIds } }]
          : []),
      ],
    },
    orderBy: { timestamp: "asc" },
  });

  if (logs.length === 0) {
    return <p className="text-xs text-slate-400">Aucun événement enregistré pour le moment.</p>;
  }

  return (
    <ol className="space-y-2 border-l border-slate-200 pl-4">
      {logs.map((log) => (
        <li key={log.id} className="relative text-sm">
          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-accent-500" />
          <p className="text-slate-700">{ACTION_LABELS[log.action] ?? log.action}</p>
          <p className="text-xs text-slate-400">
            {log.timestamp.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </li>
      ))}
    </ol>
  );
}