"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";

export default function ScheduleInterviewForm({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [datetime, setDatetime] = useState("");
  const [participant, setParticipant] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!datetime) return;
    setSubmitting(true);
    try {
      await fetch(`/api/applications/${applicationId}/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotDatetime: new Date(datetime).toISOString(),
          participants: participant ? [participant] : [],
        }),
      });
      setDone(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
        Entretien planifié. Un brouillon d&apos;invitation a été généré —{" "}
        <a href="/drafts" className="underline">
          va le valider ici
        </a>
        .
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-xs text-slate-500">Date et heure</label>
        <input
          type="datetime-local"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500">Participant (email, optionnel)</label>
        <input
          type="email"
          value={participant}
          onChange={(e) => setParticipant(e.target.value)}
          placeholder="recruteur@example.com"
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      </div>
      <button
        type="submit"
        disabled={submitting || !datetime}
        className="flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
      >
        <CalendarPlus size={14} />
        {submitting ? "Planification..." : "Planifier l'entretien"}
      </button>
    </form>
  );
}