import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignedCvUrl } from "@/lib/s3";

/**
 * GET /api/applications/[id]/cv-url
 * Génère une URL signée temporaire (15 min) pour consulter le CV original.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: { candidate: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Candidature introuvable." }, { status: 404 });
    }

    if (!application.candidate.cvUrl) {
      return NextResponse.json(
        { error: "Aucun CV disponible (données supprimées ou jamais uploadées)." },
        { status: 404 }
      );
    }

    const url = await getSignedCvUrl(application.candidate.cvUrl);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Erreur génération URL signée :", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}