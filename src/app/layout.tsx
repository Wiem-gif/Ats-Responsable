import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UserMenu from "./user-menu";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "ATS Responsable",
  description: "Suivi de candidatures assisté par IA, sans décision automatique.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  const pendingDraftsCount = user
    ? await prisma.emailDraft.count({ where: { status: "PENDING_REVIEW" } })
    : 0;

  return (
    <html lang="fr">
      <body className={`${inter.variable} font-sans bg-slate-50 text-slate-900 antialiased`}>
        {user && <UserMenu name={user.name} role={user.role} pendingDraftsCount={pendingDraftsCount} />}
        {children}
      </body>
    </html>
  );
}