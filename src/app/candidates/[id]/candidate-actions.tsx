"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, EyeOff, Eye } from "lucide-react";

export default function CandidateActions({
  applicationId,
  nameHidden,
}: {
  applicationId: string;
  nameHidden: boolean;
}) {
  const router = useRouter();
  const [loadingCv, setLoadingCv] = useState(false);
  const [togglingMask, setTogglingMask] = useState(false);

  async function openCv() {
    setLoadingCv(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/cv-url`);
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
    } finally {
      setLoadingCv(false);
    }
  }

  async function toggleMask() {
    setTogglingMask(true);
    try {
      await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameHidden: !nameHidden }),
      });
      router.refresh();
    } finally {
      setTogglingMask(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={openCv}
        disabled={loadingCv}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-accent-300 hover:text-accent-600 disabled:opacity-50"
      >
        <FileText size={14} />
        {loadingCv ? "Chargement..." : "Voir le CV original"}
      </button>
      <button
        onClick={toggleMask}
        disabled={togglingMask}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-accent-300 hover:text-accent-600 disabled:opacity-50"
      >
        {nameHidden ? <Eye size={14} /> : <EyeOff size={14} />}
        {nameHidden ? "Afficher le nom" : "Masquer le nom"}
      </button>
    </div>
  );
}