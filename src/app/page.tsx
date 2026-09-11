import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jobs = await prisma.job.findMany({
    include: { _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">ATS Responsable</h1>
        <p className="mt-1 text-sm text-slate-500">
          L&apos;IA extrait, vous décidez. Aucune note globale, aucun rejet automatique.
        </p>
      </header>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-600">Postes ouverts</h2>
        <Link
          href="/jobs/new"
          className="rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700"
        >
          + Nouveau poste
        </Link>
      </div>

      <ul className="space-y-3">
        {jobs.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
            Aucun poste pour le moment. Crée ton premier poste pour commencer.
          </li>
        )}
        {jobs.map((job) => (
          <li key={job.id}>
            <Link
              href={`/jobs/${job.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-accent-300 hover:shadow-sm"
            >
              <div>
                <p className="font-medium">{job.title}</p>
                <p className="text-xs text-slate-400">{job._count.applications} candidature(s)</p>
              </div>
              <span className="text-xs text-slate-400">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
