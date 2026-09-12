"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";

export default function UserMenu({
  name,
  role,
}: {
  name: string;
  role: "RECRUITER" | "ADMIN";
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 border-b border-[#E4E2DD] bg-white px-6 py-2.5 text-sm">
      <span className="text-[#8A8F98]">
        Connecté en tant que <span className="font-medium text-[#14181F]">{name}</span>{" "}
        <span className="rounded-full bg-[#EDF2EE] px-2 py-0.5 text-xs text-[#2F5D50]">
          {role === "ADMIN" ? "Admin" : "Recruteur"}
        </span>
      </span>
      <div className="ml-auto flex items-center gap-3">
        {role === "ADMIN" && (
          <Link
            href="/admin/users"
            className="flex items-center gap-1 text-xs text-[#6B7178] hover:text-[#2F5D50]"
          >
            <ShieldCheck size={13} /> Gérer les comptes
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-xs text-[#6B7178] hover:text-red-500"
        >
          <LogOut size={13} /> Déconnexion
        </button>
      </div>
    </div>
  );
}