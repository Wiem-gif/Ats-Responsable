"use client";

import { useState } from "react";
import { Pencil, Check, X, Quote } from "lucide-react";

const FIELD_LABELS: Record<string, string> = {
  full_name: "Nom complet",
  email: "Email",
  phone: "Téléphone",
  years_experience: "Années d'expérience",
  last_position: "Dernier poste",
  skills: "Compétence",
  education: "Formation",
  languages: "Langue",
};

export default function ExtractionField({
  id,
  fieldName,
  value,
  sourceQuote,
  correctedByRecruiter,
  correctedValue,
}: {
  id: string;
  fieldName: string;
  value: string;
  sourceQuote: string | null;
  correctedByRecruiter: boolean;
  correctedValue: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(correctedValue ?? value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(correctedByRecruiter);
  const [currentValue, setCurrentValue] = useState(correctedValue ?? value);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/extractions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correctedValue: draft }),
      });
      if (!res.ok) throw new Error("Erreur");
      setCurrentValue(draft);
      setSaved(true);
      setEditing(false);
    } catch {
      // Volontairement silencieux ici : le recruteur peut réessayer,
      // l'ancienne valeur reste affichée en cas d'échec.
    } finally {
      setSaving(false);
    }
  }

  if (!value && !sourceQuote) return null;

  return (
    <div className="group rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {FIELD_LABELS[fieldName] ?? fieldName}
            {saved && (
              <span className="ml-2 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-normal normal-case text-blue-600">
                corrigé par le recruteur
              </span>
            )}
          </p>

          {editing ? (
            <div className="mt-1 flex items-center gap-1.5">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="flex-1 rounded border border-accent-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded p-1 text-green-600 hover:bg-green-50"
                aria-label="Valider la correction"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setDraft(currentValue);
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Annuler"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <p className="mt-0.5 text-sm text-slate-800">{currentValue || "—"}</p>
          )}

          {sourceQuote && (
            <p className="mt-1.5 flex items-start gap-1 text-xs italic text-slate-400">
              <Quote size={12} className="mt-0.5 shrink-0" />
              &laquo;&nbsp;{sourceQuote}&nbsp;&raquo;
            </p>
          )}
        </div>

        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 rounded p-1 text-slate-300 opacity-0 hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
            aria-label="Corriger cette extraction"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>
    </div>
  );
}