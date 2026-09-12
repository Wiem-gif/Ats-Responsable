"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeleteCandidateButton({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [processing, setProcessing] = useState(false);

  async function handleDelete() {
    setProcessing(true);
    try {
      await fetch(`/api/candidates/${candidateId}/request-deletion`, { method: "POST" });
      router.refresh();
    } finally {
      setProcessing(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs">
        <span className="text-red-700">Supprimer définitivement les données de ce candidat ?</span>
        <button
          onClick={handleDelete}
          disabled={processing}
          className="rounded bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700"
        >
          {processing ? "..." : "Confirmer"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded border border-red-200 px-2 py-1 text-red-600 hover:bg-red-100"
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-red-500 hover:border-red-300 hover:bg-red-50"
    >
      <Trash2 size={14} /> Supprimer les données (RGPD)
    </button>
  );
}