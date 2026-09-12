"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

export default function DeclineInterviewPage() {
  const params = useParams();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleDecline() {
    setStatus("loading");
    try {
      const res = await fetch(`/api/public/interviews/${params.id}/decline`, { method: "POST" });
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FBFAF8] px-6">
      <div className="w-full max-w-sm rounded-xl border border-[#E4E2DD] bg-white p-8 text-center">
        {status === "done" ? (
          <>
            <h1 className="mb-2 text-lg font-semibold text-[#14181F]">C&apos;est noté</h1>
            <p className="text-sm text-[#6B7178]">
              Votre entretien a été décliné. L&apos;équipe recrutement reviendra vers vous pour
              proposer un nouveau créneau si besoin.
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-lg font-semibold text-[#14181F]">Décliner cet entretien ?</h1>
            <p className="mb-6 text-sm text-[#6B7178]">
              Confirmez si vous ne pouvez pas vous présenter au créneau proposé.
            </p>
            <button
              onClick={handleDecline}
              disabled={status === "loading"}
              className="w-full rounded-lg bg-[#2F5D50] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#274E43] disabled:opacity-50"
            >
              {status === "loading" ? "Confirmation..." : "Confirmer le refus"}
            </button>
            {status === "error" && (
              <p className="mt-3 text-xs text-red-500">
                Une erreur est survenue. Réessayez ou contactez l&apos;équipe recrutement.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}