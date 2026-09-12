"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Info, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erreur de connexion.");
        return;
      }

      const next = searchParams.get("next") ?? "/";
      router.push(next);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(role: "admin" | "recruteur") {
    if (role === "admin") {
      setEmail("admin@example.com");
      setPassword("admin123");
    } else {
      setEmail("recruteur@example.com");
      setPassword("recruteur123");
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F5F2] px-4 py-12 sm:px-6">
      {/* Subtle background accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#2F5D50]/[0.04] blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-[#2F5D50]/[0.05] blur-3xl" />
      </div>

      <div className="relative w-full max-w-[400px]">
        {/* Header */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2F5D50] shadow-lg shadow-[#2F5D50]/20">
            <KeyRound size={22} strokeWidth={1.75} className="text-[#EDF2EE]" />
          </div>
          <h1 className="font-serif text-[1.75rem] font-medium tracking-tight text-[#14181F]">
            ATS Responsable
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[#6B7178]">
            Connectez-vous pour accéder au pipeline de recrutement
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#E8E6E1] bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[13px] font-medium text-[#3D4450]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@entreprise.com"
                autoComplete="email"
                className="w-full rounded-xl border border-[#E4E2DD] bg-[#FBFAF8] px-3.5 py-2.5 text-[15px] text-[#14181F] placeholder:text-[#A0A5AD] transition-all duration-200 focus:border-[#2F5D50] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2F5D50]/15"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[13px] font-medium text-[#3D4450]"
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-xl border border-[#E4E2DD] bg-[#FBFAF8] px-3.5 py-2.5 text-[15px] text-[#14181F] placeholder:text-[#A0A5AD] transition-all duration-200 focus:border-[#2F5D50] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2F5D50]/15"
                required
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50/80 px-3.5 py-3 text-[13px] text-red-700">
                <Info size={16} className="mt-0.5 shrink-0 opacity-80" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F5D50] px-4 py-3 text-[15px] font-medium text-[#EDF2EE] shadow-sm transition-all duration-200 hover:bg-[#274E43] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          
        </div>

        <p className="mt-8 text-center text-[13px] text-[#8A8F98]">
          Accès réservé aux équipes autorisées
        </p>
      </div>
    </main>
  );
}