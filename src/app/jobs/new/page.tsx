"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X, Briefcase, ArrowLeft, CircleCheck } from "lucide-react";

export default function NewJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateCriterion(index: number, value: string) {
    setCriteria((prev) => prev.map((c, i) => (i === index ? value : c)));
  }

  function addCriterion() {
    setCriteria((prev) => [...prev, ""]);
  }

  function removeCriterion(index: number) {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanedCriteria = criteria.map((c) => c.trim()).filter(Boolean);
    if (!title.trim() || cleanedCriteria.length === 0) {
      setError("Le titre et au moins un critère sont requis.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, criteria: cleanedCriteria }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur lors de la création du poste.");
      }

      const data = await res.json();
      router.push(`/jobs/${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FBFAF8]">
      <div className="mx-auto max-w-5xl px-6 py-14 sm:px-8">
        {/* Breadcrumb */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#8A8F98] transition-colors hover:text-[#14181F]"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Postes ouverts
        </Link>

        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1fr_300px]">
          {/* Main column */}
          <div>
            {/* Header */}
            <div className="mb-10 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#2F5D50] text-[#EDF2EE]">
                <Briefcase size={18} strokeWidth={1.75} />
              </div>
              <div>
                <h1 className="font-serif text-[1.75rem] leading-tight tracking-tight text-[#14181F] sm:text-3xl">
                  Nouveau poste
                </h1>
                <p className="mt-2 max-w-md text-[0.9rem] leading-relaxed text-[#6B7178]">
                  Décrivez le poste et fixez les critères qui serviront de base au
                  rapprochement automatique avec les CV reçus.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="space-y-8 rounded-2xl border border-[#E4E2DD] bg-white p-6 sm:p-8">
                {/* Titre */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[#14181F]">
                    Titre du poste
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex : Développeur Fullstack IA / Automation"
                    className="w-full rounded-lg border border-[#E4E2DD] bg-white px-3.5 py-2.5 text-sm text-[#14181F] placeholder:text-[#B7BAC0] transition-colors focus:border-[#2F5D50] focus:outline-none focus:ring-2 focus:ring-[#2F5D50]/15"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[#14181F]">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Brève description du poste et du contexte."
                    className="w-full resize-none rounded-lg border border-[#E4E2DD] bg-white px-3.5 py-2.5 text-sm text-[#14181F] placeholder:text-[#B7BAC0] transition-colors focus:border-[#2F5D50] focus:outline-none focus:ring-2 focus:ring-[#2F5D50]/15"
                  />
                  <p className="text-xs text-[#8A8F98]">
                    Visible par l&apos;équipe uniquement, pas par les candidats.
                  </p>
                </div>

                {/* Critères */}
                <div className="space-y-2 border-t border-[#E4E2DD] pt-8">
                  <label className="block text-sm font-medium text-[#14181F]">
                    Critères du poste
                  </label>
                  <p className="text-xs text-[#8A8F98]">
                    Un critère par ligne. L&apos;IA indiquera pour chaque candidature
                    lesquels sont présents ou absents dans le CV.
                  </p>
                  <div className="space-y-2.5 pt-1">
                    {criteria.map((criterion, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={criterion}
                          onChange={(e) => updateCriterion(index, e.target.value)}
                          placeholder="Ex : React / Next.js"
                          className="flex-1 rounded-lg border border-[#E4E2DD] bg-white px-3.5 py-2.5 text-sm text-[#14181F] placeholder:text-[#B7BAC0] transition-colors focus:border-[#2F5D50] focus:outline-none focus:ring-2 focus:ring-[#2F5D50]/15"
                        />
                        {criteria.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCriterion(index)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#B7BAC0] transition-colors hover:bg-[#F2F1EC] hover:text-[#6B7178]"
                            aria-label="Supprimer ce critère"
                          >
                            <X size={16} strokeWidth={1.75} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addCriterion}
                    className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[#2F5D50] transition-colors hover:bg-[#EDF2EE]"
                  >
                    <Plus size={15} strokeWidth={2} />
                    Ajouter un critère
                  </button>
                </div>

                {/* Erreur */}
                {error && (
                  <div className="rounded-lg border border-[#E4B5A8] bg-[#FBF0ED] px-4 py-3 text-sm text-[#9A3B2A]">
                    {error}
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="mt-6 flex items-center justify-end gap-3">
                <Link
                  href="/"
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-[#6B7178] transition-colors hover:bg-[#F2F1EC] hover:text-[#14181F]"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#2F5D50] px-5 py-2.5 text-sm font-medium text-[#EDF2EE] transition-colors hover:bg-[#274E43] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D50] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBFAF8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Création..." : "Créer le poste"}
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-14 space-y-5 border-l border-[#E4E2DD] pl-6">
              <h2 className="text-sm font-medium text-[#14181F]">
                Comment ça fonctionne
              </h2>
              <ul className="space-y-4">
                <li className="flex gap-2.5">
                  <CircleCheck size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[#2F5D50]" />
                  <p className="text-[0.83rem] leading-relaxed text-[#6B7178]">
                    Chaque critère est vérifié indépendamment, sans les combiner en une note.
                  </p>
                </li>
                <li className="flex gap-2.5">
                  <CircleCheck size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[#2F5D50]" />
                  <p className="text-[0.83rem] leading-relaxed text-[#6B7178]">
                    Aucun CV n&apos;est rejeté automatiquement : vous gardez la décision finale.
                  </p>
                </li>
                <li className="flex gap-2.5">
                  <CircleCheck size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[#2F5D50]" />
                  <p className="text-[0.83rem] leading-relaxed text-[#6B7178]">
                    Formulez des critères factuels et vérifiables (ex : &quot;3 ans en gestion de projet&quot;).
                  </p>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}