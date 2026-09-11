import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignedCvUrl } from "@/lib/s3";

/**
 * GET /api/applications/[id]/cv-url
 * Génère une URL signée temporaire (15 min) pour consulter le CV original.
 * Le bucket reste privé en permanence — cohérent avec la confidentialité
 * des données candidat.
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

    const url = await getSignedCvUrl(application.candidate.cvUrl);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Erreur génération URL signée :", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

/**
 * PATCH /api/applications/[id]
 * Met à jour des champs limités de la candidature : masquage nom/photo,
 * étape du pipeline, raison de décision (toujours du texte libre, jamais
 * un score). Chaque changement d'étape est tracé dans AuditLog.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as {
      nameHidden?: boolean;
      photoHidden?: boolean;
      stage?: string;
      decisionReason?: string;
    };

    const application = await prisma.application.update({
      where: { id: params.id },
      data: {
        ...(body.nameHidden !== undefined && { nameHidden: body.nameHidden }),
        ...(body.photoHidden !== undefined && { photoHidden: body.photoHidden }),
        ...(body.stage !== undefined && { stage: body.stage as never }),
        ...(body.decisionReason !== undefined && { decisionReason: body.decisionReason }),
      },
    });

    if (body.stage) {
      await prisma.auditLog.create({
        data: {
          action: "application.stage_changed",
          targetType: "Application",
          targetId: application.id,
          metadata: { newStage: body.stage, reason: body.decisionReason ?? null },
        },
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Erreur mise à jour candidature :", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}