import Link from "next/link";
import { prisma } from "@/lib/prisma";
import EmailDraftCard from "./email-draft-card";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const drafts = await prisma.emailDraft.findMany({
    where: { status: "PENDING_REVIEW" },
    include: { application: { include: { candidate: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="mb-6 inline-block text-xs text-slate-400 hover:text-slate-600">
        ← Retour aux postes
      </Link>

      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Brouillons en attente</h1>
        <p className="mt-1 text-sm text-slate-500">
          Aucun email ne part sans validation. Relis, corrige si besoin, puis envoie.
        </p>
      </header>

      <div className="space-y-4">
        {drafts.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
            Aucun brouillon en attente pour le moment.
          </p>
        )}
        {drafts.map((draft) => (
          <EmailDraftCard
            key={draft.id}
            id={draft.id}
            type={draft.type}
            draftText={draft.draftText}
            candidateName={draft.application.candidate.fullName}
          />
        ))}
      </div>
    </main>
  );
}