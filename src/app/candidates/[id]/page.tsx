import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ExtractionField from "./extraction-field";
import CandidateActions from "./candidate-actions";
import ScheduleInterviewForm from "./schedule-interview-form";
import DeleteCandidateButton from "./delete-candidate-button";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  FOUND: "border-[#BFD8C9] bg-[#EDF2EE] text-[#2F5D50]",
  NOT_FOUND: "border-[#E4E2DD] bg-[#F2F1EC] text-[#8A8F98]",
  UNCERTAIN: "border-[#E3D3A0] bg-[#FBF6E7] text-[#8A6D1B]",
};

const STATUS_LABEL: Record<string, string> = {
  FOUND: "Trouvé",
  NOT_FOUND: "Non trouvé",
  UNCERTAIN: "Incertain",
};

// Champs dont la valeur est une liste (compétences, langues, etc.) : ils
// occupent toute la largeur de la grille pour laisser respirer leur contenu
// au lieu de le tasser dans une colonne étroite.
const LIST_FIELD_KEYWORDS = ["compétence", "competence", "langue", "language", "skill"];

function isListField(fieldName: string) {
  const normalized = fieldName.toLowerCase();
  return LIST_FIELD_KEYWORDS.some((k) => normalized.includes(k));
}

export default async function CandidateDetailPage({ params }: { params: { id: string } }) {
  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      candidate: true,
      job: true,
      extractions: { orderBy: { createdAt: "asc" } },
      criteriaMatches: { include: { criterion: true } },
      suggestedQuestions: true,
    },
  });

  if (!application) notFound();

  if (application.candidate.anonymized) {
    return (
      <main className="min-h-screen bg-[#FBFAF8]">
        <div className="mx-auto max-w-3xl px-6 py-14 sm:px-8">
          <Link
            href={`/jobs/${application.jobId}`}
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#8A8F98] transition-colors hover:text-[#14181F]"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Retour au poste
          </Link>
          <div className="rounded-2xl border border-dashed border-[#E4E2DD] p-10 text-center">
            <p className="text-sm font-medium text-[#14181F]">
              Les données de ce candidat ont été supprimées.
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-[#8A8F98]">
              Suppression demandée le{" "}
              {application.candidate.deletionRequestedAt?.toLocaleDateString("fr-FR")}. Cette fiche
              est conservée uniquement à des fins d&apos;audit, sans aucune donnée identifiante.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const displayName = application.nameHidden ? "Candidat masqué" : application.candidate.fullName;

  return (
    <main className="min-h-screen bg-[#FBFAF8]">
      <div className="mx-auto max-w-3xl px-6 py-14 sm:px-8">
        <Link
          href={`/jobs/${application.jobId}`}
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#8A8F98] transition-colors hover:text-[#14181F]"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Retour au poste
        </Link>

        {/* Header */}
        <header className="mb-8 rounded-2xl border border-[#E4E2DD] bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl tracking-tight text-[#14181F]">{displayName}</h1>
              <p className="mt-1.5 text-sm text-[#6B7178]">
                Candidature pour{" "}
                <span className="font-medium text-[#14181F]">{application.job.title}</span>
              </p>
              {application.extractionStatus === "FAILED" && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[#E4B5A8] bg-[#FBF0ED] px-2.5 py-1 text-xs font-medium text-[#9A3B2A]">
                  <AlertTriangle size={13} strokeWidth={1.75} />
                  Extraction automatique échouée — saisie manuelle nécessaire
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CandidateActions applicationId={application.id} nameHidden={application.nameHidden} />
              <DeleteCandidateButton candidateId={application.candidateId} />
            </div>
          </div>
        </header>

        {/* Résumé factuel */}
        <section className="mb-6 rounded-2xl border border-[#E4E2DD] bg-white p-6 sm:p-8">
          <h2 className="text-sm font-medium text-[#14181F]">Résumé factuel</h2>
          <p className="mb-5 mt-1 text-[0.8rem] leading-relaxed text-[#8A8F98]">
            Extrait automatiquement du CV. Chaque champ est relié à une citation exacte du
            document source — corrigeable à tout moment si l&apos;IA s&apos;est trompée.
          </p>
          {application.extractions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#E4E2DD] p-4 text-sm text-[#8A8F98]">
              Aucune extraction disponible pour le moment.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {application.extractions.map((ext) => (
                <div key={ext.id} className={isListField(ext.fieldName) ? "sm:col-span-2" : undefined}>
                  <ExtractionField
                    id={ext.id}
                    fieldName={ext.fieldName}
                    value={ext.value}
                    sourceQuote={ext.sourceQuote}
                    correctedByRecruiter={ext.correctedByRecruiter}
                    correctedValue={ext.correctedValue}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Critères du poste */}
        <section className="mb-6 rounded-2xl border border-[#E4E2DD] bg-white p-6 sm:p-8">
          <h2 className="text-sm font-medium text-[#14181F]">Critères du poste</h2>
          <p className="mb-5 mt-1 text-[0.8rem] leading-relaxed text-[#8A8F98]">
            Constat factuel uniquement — aucun score global, aucune recommandation
            d&apos;embauche automatique.
          </p>
          <div className="space-y-2.5">
            {application.criteriaMatches.map((match) => (
              <div
                key={match.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-[#E4E2DD] p-3.5"
              >
                <div>
                  <p className="text-sm font-medium text-[#14181F]">{match.criterion.label}</p>
                  {match.evidenceQuote && (
                    <p className="mt-1 text-xs italic leading-relaxed text-[#8A8F98]">
                      « {match.evidenceQuote} »
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[match.status]}`}
                >
                  {STATUS_LABEL[match.status]}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Questions suggérées */}
        <section className="mb-6 rounded-2xl border border-[#E4E2DD] bg-white p-6 sm:p-8">
          <h2 className="text-sm font-medium text-[#14181F]">
            Questions suggérées pour l&apos;entretien
          </h2>
          <p className="mb-5 mt-1 text-[0.8rem] leading-relaxed text-[#8A8F98]">
            Priorité aux critères non trouvés ou incertains, pour clarifier en direct.
          </p>
          <ol className="space-y-2.5">
            {application.suggestedQuestions.map((q) => (
              <li key={q.id} className="rounded-lg border border-[#E4E2DD] p-3.5">
                <p className="text-sm text-[#14181F]">{q.questionText}</p>
                {q.basedOn && (
                  <p className="mt-1.5 text-xs text-[#8A8F98]">Basé sur : {q.basedOn}</p>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* Planification d'entretien */}
        <section className="rounded-2xl border border-[#E4E2DD] bg-white p-6 sm:p-8">
          <h2 className="text-sm font-medium text-[#14181F]">Planifier un entretien</h2>
          <p className="mb-5 mt-1 text-[0.8rem] leading-relaxed text-[#8A8F98]">
            Génère un brouillon d&apos;invitation à valider avant envoi.
          </p>
          <ScheduleInterviewForm applicationId={application.id} />
        </section>
      </div>
    </main>
  );
}