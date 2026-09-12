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

// Champs dont la valeur est une liste séparée par virgules — affichés en
// pastilles plutôt qu'en texte brut.
const LIST_FIELDS = ["skills", "languages"];

function splitList(value: string) {
  return value
    .split(/[,;/]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

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

  const isList = LIST_FIELDS.includes(fieldName);
  const listItems = isList && currentValue ? splitList(currentValue) : [];

  return (
    <div className="group rounded-lg border border-[#E4E2DD] p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[0.7rem] font-medium uppercase tracking-wide text-[#8A8F98]">
            {FIELD_LABELS[fieldName] ?? fieldName}
            {saved && (
              <span className="ml-2 rounded-full bg-[#EDF2EE] px-1.5 py-0.5 text-[10px] font-normal normal-case text-[#2F5D50]">
                corrigé par le recruteur
              </span>
            )}
          </p>

          {editing ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={isList ? "Séparez les éléments par une virgule" : undefined}
                className="flex-1 rounded-md border border-[#E4E2DD] px-2.5 py-1.5 text-sm text-[#14181F] focus:border-[#2F5D50] focus:outline-none focus:ring-2 focus:ring-[#2F5D50]/15"
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md p-1.5 text-[#2F5D50] hover:bg-[#EDF2EE]"
                aria-label="Valider la correction"
              >
                <Check size={16} strokeWidth={2} />
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setDraft(currentValue);
                }}
                className="rounded-md p-1.5 text-[#B7BAC0] hover:bg-[#F2F1EC] hover:text-[#6B7178]"
                aria-label="Annuler"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>
          ) : isList && listItems.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {listItems.map((item, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full border border-[#E4E2DD] bg-[#FBFAF8] px-2.5 py-1 text-xs font-medium text-[#14181F]"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-0.5 text-sm text-[#14181F]">{currentValue || "—"}</p>
          )}

          {sourceQuote && (
            <p className="mt-2 flex items-start gap-1 text-xs italic leading-relaxed text-[#8A8F98]">
              <Quote size={12} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              « {sourceQuote} »
            </p>
          )}
        </div>

        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-md p-1 text-[#D8D6D0] opacity-0 transition-colors hover:bg-[#F2F1EC] hover:text-[#6B7178] group-hover:opacity-100"
            aria-label="Corriger cette extraction"
          >
            <Pencil size={14} strokeWidth={1.75} />
          </button>
        )}
      </div>
    </div>
  );
}