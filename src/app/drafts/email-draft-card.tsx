"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2, Pencil } from "lucide-react";

export default function EmailDraftCard({
  id,
  type,
  draftText,
  candidateName,
}: {
  id: string;
  type: string;
  draftText: string;
  candidateName: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(draftText);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const TYPE_LABELS: Record<string, string> = {
    INVITATION: "Invitation à un entretien",
    REMINDER: "Rappel J-1",
    FOLLOW_UP: "Relance",
    DELETION_CONFIRMATION: "Confirmation de suppression",
  };

  async function handleAction(action: "approve" | "discard") {
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch(`/api/email-drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, editedText: action === "approve" ? text : undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue lors de l'envoi.");
        return;
      }

      router.refresh();
    } catch (err) {
      setError("Erreur réseau : le serveur n'a pas répondu.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {TYPE_LABELS[type] ?? type}
          </span>
          <span className="ml-2 text-sm text-slate-500">pour {candidateName}</span>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
          >
            <Pencil size={12} /> Éditer
          </button>
        )}
      </div>

      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-accent-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      ) : (
        <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{text}</p>
      )}

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => handleAction("approve")}
          disabled={processing}
          className="flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-700 disabled:opacity-50"
        >
          <Send size={13} /> {processing ? "Envoi..." : "Valider et envoyer"}
        </button>
        <button
          onClick={() => handleAction("discard")}
          disabled={processing}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
        >
          <Trash2 size={13} /> Rejeter
        </button>
      </div>
    </div>
  );
}