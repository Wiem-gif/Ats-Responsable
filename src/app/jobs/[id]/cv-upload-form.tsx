"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";

export default function CvUploadForm({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "warning" | "success"; text: string } | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!fullName.trim() || !email.trim() || !file) {
      setMessage({ type: "error", text: "Nom, email et CV sont requis." });
      return;
    }
    if (!consentGiven) {
      setMessage({
        type: "error",
        text: "Le consentement du candidat est requis avant tout traitement de ses données.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("fullName", fullName);
      formData.append("email", email);
      formData.append("cv", file);
      formData.append("jobId", jobId);
      formData.append("consentGiven", "true");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (res.status === 409) {
        // Cas limite : doublon détecté — jamais de fusion automatique
        setMessage({
          type: "warning",
          text: "Un candidat avec des informations similaires existe déjà. Aucune fusion automatique n'a été effectuée.",
        });
        return;
      }

      if (!res.ok) {
        throw new Error(data.error ?? "Erreur lors de l'envoi du CV.");
      }

      if (data.warning) {
        // Cas limite : CV sans texte exploitable, même après OCR
        setMessage({ type: "warning", text: data.warning });
      } else {
        setMessage({ type: "success", text: "CV reçu, traitement en cours." });
      }

      setFullName("");
      setEmail("");
      setFile(null);
      setConsentGiven(false);
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erreur inconnue." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nom complet"
          className="rounded-lg border border-[#E4E2DD] px-3 py-2 text-sm text-[#14181F] placeholder:text-[#B7BAC0] focus:border-[#2F5D50] focus:outline-none focus:ring-2 focus:ring-[#2F5D50]/15"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded-lg border border-[#E4E2DD] px-3 py-2 text-sm text-[#14181F] placeholder:text-[#B7BAC0] focus:border-[#2F5D50] focus:outline-none focus:ring-2 focus:ring-[#2F5D50]/15"
        />
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#E4E2DD] px-3 py-6 text-sm text-[#8A8F98] transition-colors hover:border-[#2F5D50] hover:text-[#2F5D50]">
        <UploadCloud size={18} strokeWidth={1.75} />
        {file ? file.name : "Choisir un fichier CV (PDF)"}
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <label className="flex items-start gap-2 text-xs leading-relaxed text-[#8A8F98]">
        <input
          type="checkbox"
          checked={consentGiven}
          onChange={(e) => setConsentGiven(e.target.checked)}
          className="mt-0.5 accent-[#2F5D50]"
        />
        Le candidat a été informé et a donné son consentement au traitement de ses
        données pour ce recrutement.
      </label>

      {message && (
        <p
          className={
            message.type === "error"
              ? "rounded-lg border border-[#E4B5A8] bg-[#FBF0ED] px-3 py-2 text-sm text-[#9A3B2A]"
              : message.type === "warning"
              ? "rounded-lg border border-[#E3D3A0] bg-[#FBF6E7] px-3 py-2 text-sm text-[#8A6D1B]"
              : "rounded-lg border border-[#BFD8C9] bg-[#EDF2EE] px-3 py-2 text-sm text-[#2F5D50]"
          }
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-[#2F5D50] px-4 py-2.5 text-sm font-medium text-[#EDF2EE] transition-colors hover:bg-[#274E43] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D50] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Envoi en cours..." : "Envoyer le CV"}
      </button>
    </form>
  );
}