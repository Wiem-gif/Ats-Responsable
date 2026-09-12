import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Plus, Briefcase, ChevronRight, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jobs = await prisma.job.findMany({
    include: { _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-[#FBFAF8]">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8">
        {/* Header */}
        <header className="mb-14 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#2F5D50] text-[#EDF2EE]">
            <Briefcase size={18} strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="font-serif text-[1.75rem] leading-tight tracking-tight text-[#14181F] sm:text-3xl">
              ATS Responsable
            </h1>
            <p className="mt-2 max-w-sm text-[0.9rem] leading-relaxed text-[#6B7178]">
              L&apos;IA extrait, vous décidez. Aucune note globale, aucun rejet automatique.
            </p>
          </div>
        </header>

        {/* Section header */}
        <div className="mb-2 flex items-end justify-between border-b border-[#E4E2DD] pb-4">
          <div>
            <h2 className="text-[0.95rem] font-medium text-[#14181F]">Postes ouverts</h2>
            <p className="mt-0.5 text-[0.8rem] text-[#8A8F98]">
              {jobs.length} poste{jobs.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2F5D50] px-3.5 py-2 text-sm font-medium text-[#EDF2EE] transition-colors hover:bg-[#274E43] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D50] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBFAF8]"
          >
            <Plus size={15} strokeWidth={2} />
            Nouveau poste
          </Link>
        </div>

        {/* Jobs list */}
        {jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E4E2DD] px-8 py-16 text-center">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#EDF2EE] text-[#2F5D50]">
              <Briefcase size={20} strokeWidth={1.75} />
            </div>
            <p className="text-[0.95rem] font-medium text-[#14181F]">Aucun poste ouvert</p>
            <p className="mx-auto mt-1.5 max-w-xs text-sm text-[#8A8F98]">
              Créez un poste pour commencer à recevoir des candidatures.
            </p>
            <Link
              href="/jobs/new"
              className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-[#2F5D50] px-4 py-2 text-sm font-medium text-[#EDF2EE] transition-colors hover:bg-[#274E43]"
            >
              <Plus size={15} strokeWidth={2} />
              Créer un poste
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[#E4E2DD]">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="group flex items-center gap-4 border-l-2 border-transparent py-5 pl-4 pr-2 -ml-4 transition-colors hover:border-[#2F5D50] hover:bg-[#F2F1EC] focus:outline-none focus-visible:border-[#2F5D50] focus-visible:bg-[#F2F1EC]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.95rem] font-medium text-[#14181F]">
                      {job.title}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-[0.8rem] text-[#8A8F98]">
                      <Users size={13} strokeWidth={1.75} className="shrink-0" />
                      <span>
                        {job._count.applications} candidature
                        {job._count.applications !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <ChevronRight
                    size={17}
                    strokeWidth={1.75}
                    className="shrink-0 text-[#B7BAC0] transition-transform group-hover:translate-x-0.5 group-hover:text-[#2F5D50]"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}