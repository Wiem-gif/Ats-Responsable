"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ManualExtractionForm({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [fields, setFields] = useState({
    full_name: "",
    years_experience: "",
    last_position: "",
    skills: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/manual-extraction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'enregistrement.");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4"
    >
      <p className="text-xs font-medium text-amber-700">
        Extraction automatique indisponible — saisie manuelle du recruteur
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={fields.full_name}
          onChange={(e) => update("full_name", e.target.value)}
          placeholder="Nom complet"
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
        <input
          value={fields.years_experience}
          onChange={(e) => update("years_experience", e.target.value)}
          placeholder="Années d'expérience"
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
        <input
          value={fields.last_position}
          onChange={(e) => update("last_position", e.target.value)}
          placeholder="Dernier poste"
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
        <input
          value={fields.skills}
          onChange={(e) => update("skills", e.target.value)}
          placeholder="Compétences (séparées par des virgules)"
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-700 disabled:opacity-50"
      >
        {submitting ? "Enregistrement..." : "Enregistrer la saisie manuelle"}
      </button>
    </form>
  );
}