import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });
  }

  try {
    const { name, email, password, role } = (await req.json()) as {
      name: string;
      email: string;
      password: string;
      role: "RECRUITER" | "ADMIN";
    };

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nom, email et mot de passe requis." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: role ?? "RECRUITER" },
    });

    return NextResponse.json({ id: user.id });
  } catch (error) {
    console.error("Erreur création compte :", error);
    return NextResponse.json({ error: "Erreur lors de la création (email déjà utilisé ?)." }, { status: 500 });
  }
}