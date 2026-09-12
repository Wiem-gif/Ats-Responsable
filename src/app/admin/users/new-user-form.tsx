"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewUserForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"RECRUITER" | "ADMIN">("RECRUITER");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur.");
        return;
      }
      setName("");
      setEmail("");
      setPassword("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-[#E4E2DD] bg-white p-5">
      <div className="grid grid-cols-2 gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom complet"
          className="rounded-lg border border-[#E4E2DD] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2F5D50]"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded-lg border border-[#E4E2DD] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2F5D50]"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          className="rounded-lg border border-[#E4E2DD] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2F5D50]"
          required
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "RECRUITER" | "ADMIN")}
          className="rounded-lg border border-[#E4E2DD] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2F5D50]"
        >
          <option value="RECRUITER">Recruteur</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-[#2F5D50] px-4 py-2 text-sm font-medium text-white hover:bg-[#274E43] disabled:opacity-50"
      >
        {submitting ? "Création..." : "Créer le compte"}
      </button>
    </form>
  );
}