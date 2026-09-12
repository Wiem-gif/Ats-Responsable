"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, ShieldCheck, Mail } from "lucide-react";

export default function UserMenu({
  name,
  role,
  pendingDraftsCount,
}: {
  name: string;
  role: "RECRUITER" | "ADMIN";
  pendingDraftsCount: number;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 border-b border-[#E4E2DD] bg-white px-6 py-2.5 text-sm">
      <Link href="/" className="font-medium text-[#14181F] hover:text-[#2F5D50]">
        ATS Responsable
      </Link>
      <span className="text-[#8A8F98]">
        Connecté en tant que <span className="font-medium text-[#14181F]">{name}</span>{" "}
        <span className="rounded-full bg-[#EDF2EE] px-2 py-0.5 text-xs text-[#2F5D50]">
          {role === "ADMIN" ? "Admin" : "Recruteur"}
        </span>
      </span>
      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/drafts"
          className="flex items-center gap-1.5 rounded-lg border border-[#E4E2DD] px-2.5 py-1 text-xs text-[#3D4450] hover:border-[#2F5D50] hover:text-[#2F5D50]"
        >
          <Mail size={13} />
          Brouillons
          {pendingDraftsCount > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#2F5D50] px-1 text-[10px] font-medium text-white">
              {pendingDraftsCount}
            </span>
          )}
        </Link>
        {role === "ADMIN" && (
          <Link
            href="/admin/users"
            className="flex items-center gap-1 text-xs text-[#6B7178] hover:text-[#2F5D50]"
          >
            <ShieldCheck size={13} /> Comptes
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