import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ExtractionField from "./extraction-field";
import CandidateActions from "./candidate-actions";
import ScheduleInterviewForm from "./schedule-interview-form";
import DeleteCandidateButton from "./delete-candidate-button";
import InterviewFeedbackAndDecision from "./interview-feedback-and-decision";
import AuditTimeline from "./audit-timeline";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  FOUND: "badge-found",
  NOT_FOUND: "badge-notfound",
  UNCERTAIN: "badge-uncertain",
};

const STATUS_LABEL: Record<string, string> = {
  FOUND: "Trouvé",
  NOT_FOUND: "Non trouvé",
  UNCERTAIN: "Incertain",
};

export default async function CandidateDetailPage({ params }: { params: { id: string } }) {
  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      candidate: true,
      job: true,
      extractions: { orderBy: { createdAt: "asc" } },
      criteriaMatches: { include: { criterion: true } },
      suggestedQuestions: true,
      interviews: { orderBy: { createdAt: "desc" } },
      emailDrafts: true,
    },
  });

  if (!application) notFound();

  if (application.candidate.anonymized) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href={`/jobs/${application.jobId}`}
          className="mb-6 inline-block text-xs text-slate-400 hover:text-slate-600"
        >
          ← Retour au poste
        </Link>
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm font-medium text-slate-600">
            Les données de ce candidat ont été supprimées.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Suppression demandée le{" "}
            {application.candidate.deletionRequestedAt?.toLocaleDateString("fr-FR")}. Cette fiche est
            conservée uniquement à des fins d&apos;audit, sans aucune donnée identifiante.
          </p>
        </div>
      </main>
    );
  }

  const displayName = application.nameHidden ? "Candidat masqué" : application.candidate.fullName;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/jobs/${application.jobId}`}
        className="mb-6 inline-block text-xs text-slate-400 hover:text-slate-600"
      >
        ← Retour au poste
      </Link>

      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{displayName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Candidature pour <span className="font-medium">{application.job.title}</span>
          </p>
          {application.candidate.portfolioUrl && !application.nameHidden && (
            <a
              href={application.candidate.portfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-accent-600 underline"
            >
              Voir le portfolio
            </a>
          )}
          {application.extractionStatus === "FAILED" && (
            <span className="badge-uncertain mt-2 inline-block">
              Extraction automatique échouée — saisie manuelle nécessaire
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CandidateActions applicationId={application.id} nameHidden={application.nameHidden} />
          <DeleteCandidateButton candidateId={application.candidateId} />
        </div>
      </header>

      {/* --- Résumé factuel extrait par l'IA --------------------------------- */}
      <section className="mb-8">
        <h2 className="mb-1 text-sm font-medium text-slate-700">Résumé factuel</h2>
        <p className="mb-3 text-xs text-slate-400">
          Extrait automatiquement du CV. Chaque champ est relié à une citation exacte du
          document source — corrigeable à tout moment si l&apos;IA s&apos;est trompée.
        </p>
        {application.extractions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-400">
            Aucune extraction disponible pour le moment.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {application.extractions.map((ext) => (
              <ExtractionField
                key={ext.id}
                id={ext.id}
                fieldName={ext.fieldName}
                value={ext.value}
                sourceQuote={ext.sourceQuote}
                correctedByRecruiter={ext.correctedByRecruiter}
                correctedValue={ext.correctedValue}
              />
            ))}
          </div>
        )}
      </section>

      {/* --- Critères du poste ------------------------------------------------- */}
      <section className="mb-8">
        <h2 className="mb-1 text-sm font-medium text-slate-700">Critères du poste</h2>
        <p className="mb-3 text-xs text-slate-400">
          Constat factuel uniquement — aucun score global, aucune recommandation
          d&apos;embauche automatique.
        </p>
        <div className="space-y-2">
          {application.criteriaMatches.map((match) => (
            <div
              key={match.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{match.criterion.label}</p>
                {match.evidenceQuote && (
                  <p className="mt-1 text-xs italic text-slate-400">
                    &laquo;&nbsp;{match.evidenceQuote}&nbsp;&raquo;
                  </p>
                )}
              </div>
              <span className={STATUS_BADGE[match.status]}>{STATUS_LABEL[match.status]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* --- Questions suggérées ------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="mb-1 text-sm font-medium text-slate-700">Questions suggérées pour l&apos;entretien</h2>
        <p className="mb-3 text-xs text-slate-400">
          Priorité aux critères non trouvés ou incertains, pour clarifier en direct.
        </p>
        <ol className="space-y-2">
          {application.suggestedQuestions.map((q) => (
            <li key={q.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-sm text-slate-800">{q.questionText}</p>
              {q.basedOn && <p className="mt-1 text-xs text-slate-400">Basé sur : {q.basedOn}</p>}
            </li>
          ))}
        </ol>
      </section>
      {/* --- Planification d'entretien ------------------------------------------ */}
      <section className="mb-8">
        <h2 className="mb-1 text-sm font-medium text-slate-700">Planifier un entretien</h2>
        <p className="mb-3 text-xs text-slate-400">
          Génère un brouillon d&apos;invitation à valider avant envoi.
        </p>
        <ScheduleInterviewForm applicationId={application.id} />
      </section>

      {/* --- Feedback d'entretien et décision finale ----------------------------- */}
      {application.interviews.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 text-sm font-medium text-slate-700">Suivi de l&apos;entretien</h2>
          <p className="mb-3 text-xs text-slate-400">
            Le passage à &quot;Entretien fait&quot; puis &quot;Décidé&quot; se fait ici, jamais
            automatiquement.
          </p>
          <InterviewFeedbackAndDecision
            applicationId={application.id}
            interviews={application.interviews}
            currentStage={application.stage}
            currentDecisionReason={application.decisionReason}
          />
        </section>
      )}

      {/* --- Chronologie ---------------------------------------------------------- */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-slate-700">Historique</h2>
        <AuditTimeline
          applicationId={application.id}
          candidateId={application.candidateId}
          interviewIds={application.interviews.map((i) => i.id)}
          emailDraftIds={application.emailDrafts.map((d) => d.id)}
        />
      </section>
    </main>
  );
}