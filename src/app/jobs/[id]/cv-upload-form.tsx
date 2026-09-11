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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-medium text-slate-700">Ajouter une candidature</h3>

      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nom complet"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-6 text-sm text-slate-500 hover:border-accent-400 hover:text-accent-600">
        <UploadCloud size={18} />
        {file ? file.name : "Choisir un fichier CV (PDF)"}
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <label className="flex items-start gap-2 text-xs text-slate-500">
        <input
          type="checkbox"
          checked={consentGiven}
          onChange={(e) => setConsentGiven(e.target.checked)}
          className="mt-0.5"
        />
        Le candidat a été informé et a donné son consentement au traitement de ses
        données pour ce recrutement.
      </label>

      {message && (
        <p
          className={
            message.type === "error"
              ? "rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
              : message.type === "warning"
              ? "rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700"
              : "rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"
          }
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
      >
        {submitting ? "Envoi en cours..." : "Envoyer le CV"}
      </button>
    </form>
  );
}