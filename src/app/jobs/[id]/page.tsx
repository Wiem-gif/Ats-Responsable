import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CvUploadForm from "./cv-upload-form";
import type { ApplicationStage } from "@prisma/client";
import { ArrowLeft, Upload } from "lucide-react";

export const dynamic = "force-dynamic";

const STAGE_LABELS: Record<ApplicationStage, string> = {
  RECEIVED: "Reçu",
  SCREENING: "Présélection",
  INTERVIEW_SCHEDULED: "Entretien planifié",
  INTERVIEW_DONE: "Entretien fait",
  DECIDED: "Décidé",
};

const STAGE_ORDER: ApplicationStage[] = [
  "RECEIVED",
  "SCREENING",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_DONE",
  "DECIDED",
];

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      criteria: true,
      applications: {
        include: { candidate: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!job) notFound();

  const applicationsByStage = STAGE_ORDER.map((stage) => ({
    stage,
    applications: job.applications.filter((a) => a.stage === stage),
  }));

  return (
    <main className="min-h-screen bg-[#FBFAF8]">
      <div className="mx-auto max-w-6xl px-6 py-14 sm:px-8">
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#8A8F98] transition-colors hover:text-[#14181F]"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Postes ouverts
        </Link>

        {/* Header */}
        <header className="mb-10 rounded-2xl border border-[#E4E2DD] bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-[1.75rem] leading-tight tracking-tight text-[#14181F] sm:text-3xl">
                {job.title}
              </h1>
              {job.description && (
                <p className="mt-2.5 max-w-2xl text-[0.9rem] leading-relaxed text-[#6B7178]">
                  {job.description}
                </p>
              )}
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#E4E2DD] bg-[#FBFAF8] px-3.5 py-1.5 text-xs font-medium text-[#6B7178]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2F5D50]" />
              {job.applications.length} candidature
              {job.applications.length !== 1 ? "s" : ""}
            </div>
          </div>

          {job.criteria.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E4E2DD] pt-5">
              {job.criteria.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center rounded-full border border-[#E4E2DD] bg-[#FBFAF8] px-3 py-1 text-xs font-medium text-[#14181F]"
                >
                  {c.label}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Upload section */}
        <section className="mb-14">
          <div className="rounded-2xl border border-[#E4E2DD] bg-white p-6 sm:p-10">
            <div className="mx-auto flex max-w-lg flex-col items-center text-center">
              <div className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EDF2EE] text-[#2F5D50]">
                <Upload size={17} strokeWidth={1.75} />
              </div>
              <h2 className="text-sm font-medium text-[#14181F]">
                Ajouter une candidature
              </h2>
              <p className="mb-6 mt-1 text-[0.8rem] text-[#8A8F98]">
                Déposez un CV pour lancer l&apos;analyse automatique.
              </p>
              <div className="w-full text-left">
                <CvUploadForm jobId={job.id} />
              </div>
            </div>
          </div>
        </section>

        {/* Pipeline */}
        <section>
          <div className="mb-5 flex items-center justify-between border-b border-[#E4E2DD] pb-4">
            <h2 className="text-[0.95rem] font-medium text-[#14181F]">
              Pipeline des candidatures
            </h2>
            <span className="text-[0.8rem] text-[#8A8F98]">
              {job.applications.length} au total
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {applicationsByStage.map(({ stage, applications }) => (
              <div key={stage} className="flex flex-col rounded-xl border border-[#E4E2DD] bg-white">
                {/* Stage header */}
                <div className="border-b border-[#E4E2DD] px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[0.75rem] font-medium text-[#6B7178]">
                      {STAGE_LABELS[stage]}
                    </p>
                    <span
                      className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-medium ${
                        applications.length > 0
                          ? "bg-[#2F5D50] text-[#EDF2EE]"
                          : "bg-[#F2F1EC] text-[#B7BAC0]"
                      }`}
                    >
                      {applications.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex flex-1 flex-col gap-2 p-2.5">
                  {applications.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[#E4E2DD] py-8">
                      <p className="text-xs text-[#B7BAC0]">Aucun candidat</p>
                    </div>
                  ) : (
                    applications.map((app) => (
                      <Link
                        key={app.id}
                        href={`/candidates/${app.id}`}
                        className="group block rounded-lg border border-[#E4E2DD] p-3 transition-colors hover:border-[#2F5D50] hover:bg-[#F2F1EC]"
                      >
                        <p className="truncate text-[0.85rem] font-medium text-[#14181F]">
                          {app.nameHidden ? "Candidat masqué" : app.candidate.fullName}
                        </p>

                        {(app.extractionStatus === "FAILED" ||
                          app.extractionStatus === "PENDING") && (
                          <div className="mt-2">
                            {app.extractionStatus === "FAILED" && (
                              <span className="inline-flex items-center rounded-md border border-[#E4B5A8] bg-[#FBF0ED] px-2 py-0.5 text-[11px] font-medium text-[#9A3B2A]">
                                Extraction échouée
                              </span>
                            )}
                            {app.extractionStatus === "PENDING" && (
                              <span className="inline-flex items-center rounded-md border border-[#E3D3A0] bg-[#FBF6E7] px-2 py-0.5 text-[11px] font-medium text-[#8A6D1B]">
                                Analyse en cours
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}