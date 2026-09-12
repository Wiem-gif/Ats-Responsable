import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import NewUserForm from "./new-user-form";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect("/");
  }

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="mb-6 inline-block text-xs text-slate-400 hover:text-slate-600">
        ← Retour aux postes
      </Link>

      <h1 className="mb-6 text-xl font-semibold tracking-tight">Comptes</h1>

      <div className="mb-8 space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium text-slate-800">{u.name}</p>
              <p className="text-xs text-slate-400">{u.email}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {u.role === "ADMIN" ? "Admin" : "Recruteur"}
            </span>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-medium text-slate-700">Créer un nouveau compte</h2>
      <NewUserForm />
    </main>
  );
}