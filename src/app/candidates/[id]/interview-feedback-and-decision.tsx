"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type InterviewLite = {
  id: string;
  status: string;
  slotDatetime: string | Date;
  feedbackText: string | null;
};

export default function InterviewFeedbackAndDecision({
  applicationId,
  interviews,
  currentStage,
  currentDecisionReason,
}: {
  applicationId: string;
  interviews: InterviewLite[];
  currentStage: string;
  currentDecisionReason: string | null;
}) {
  const router = useRouter();
  const [feedbackText, setFeedbackText] = useState("");
  const [decisionReason, setDecisionReason] = useState(currentDecisionReason ?? "");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Le dernier entretien non encore complété (s'il existe) est celui pour
  // lequel on demande un feedback.
  const pendingInterview = interviews.find((i) => i.status !== "COMPLETED");

  async function handleSubmitFeedback() {
    if (!pendingInterview || !feedbackText.trim()) return;
    setSubmittingFeedback(true);
    try {
      await fetch(`/api/interviews/${pendingInterview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackText }),
      });
      router.refresh();
    } finally {
      setSubmittingFeedback(false);
    }
  }

  async function handleDecision(decided: boolean) {
    if (!decided) return;
    setSubmittingDecision(true);
    try {
      await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "DECIDED", decisionReason }),
      });
      router.refresh();
    } finally {
      setSubmittingDecision(false);
    }
  }

  if (currentStage === "DECIDED") {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Décision enregistrée
        </p>
        <p className="mt-1 text-sm text-slate-700">{currentDecisionReason}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingInterview && pendingInterview.status !== "DECLINED" && (
        <div>
          <label className="mb-1 block text-xs text-slate-500">
            Retour sur l&apos;entretien du{" "}
            {new Date(pendingInterview.slotDatetime).toLocaleDateString("fr-FR")}
          </label>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={3}
            placeholder="Notes libres sur l'entretien..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
          <button
            onClick={handleSubmitFeedback}
            disabled={submittingFeedback || !feedbackText.trim()}
            className="mt-2 rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-700 disabled:opacity-50"
          >
            {submittingFeedback ? "Enregistrement..." : "Marquer l'entretien comme terminé"}
          </button>
        </div>
      )}

      {currentStage === "INTERVIEW_DONE" && (
        <div>
          <label className="mb-1 block text-xs text-slate-500">
            Décision finale (raison en texte libre — jamais un score)
          </label>
          <textarea
            value={decisionReason}
            onChange={(e) => setDecisionReason(e.target.value)}
            rows={2}
            placeholder="Ex : profil retenu pour la suite du process / profil non retenu car..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
          <button
            onClick={() => handleDecision(true)}
            disabled={submittingDecision || !decisionReason.trim()}
            className="mt-2 rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-700 disabled:opacity-50"
          >
            {submittingDecision ? "Enregistrement..." : "Enregistrer la décision"}
          </button>
        </div>
      )}
    </div>
  );
}