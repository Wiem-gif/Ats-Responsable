import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/applications/[id]
 * Met à jour des champs limités de la candidature : masquage nom/photo,
 * étape du pipeline, raison de décision.
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