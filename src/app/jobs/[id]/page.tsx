import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CvUploadForm from "./cv-upload-form";
import type { ApplicationStage } from "@prisma/client";

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
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/" className="mb-6 inline-block text-xs text-slate-400 hover:text-slate-600">
        ← Retour aux postes
      </Link>

      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">{job.title}</h1>
        {job.description && <p className="mt-1 text-sm text-slate-500">{job.description}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.criteria.map((c) => (
            <span
              key={c.id}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
            >
              {c.label}
            </span>
          ))}
        </div>
      </header>

      <div className="mb-10 max-w-md">
        <CvUploadForm jobId={job.id} />
      </div>

      <h2 className="mb-4 text-sm font-medium text-slate-600">
        Pipeline des candidatures ({job.applications.length})
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {applicationsByStage.map(({ stage, applications }) => (
          <div key={stage} className="rounded-xl bg-slate-100/60 p-3">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
              {STAGE_LABELS[stage]} · {applications.length}
            </p>
            <div className="space-y-2">
              {applications.length === 0 && (
                <p className="text-xs text-slate-400">Aucun candidat</p>
              )}
              {applications.map((app) => (
                <Link
                  key={app.id}
                  href={`/candidates/${app.id}`}
                  className="block rounded-lg border border-slate-200 bg-white p-3 text-sm hover:border-accent-300 hover:shadow-sm"
                >
                  <p className="font-medium text-slate-800">
                    {app.nameHidden ? "Candidat masqué" : app.candidate.fullName}
                  </p>
                  {app.extractionStatus === "FAILED" && (
                    <span className="badge-uncertain mt-1">Extraction échouée</span>
                  )}
                  {app.extractionStatus === "PENDING" && (
                    <span className="badge-notfound mt-1">Analyse en cours</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}