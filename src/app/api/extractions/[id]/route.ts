import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/extractions/[id]
 * Permet au recruteur de corriger une valeur extraite par erreur par l'IA.
 * Body : { correctedValue: string }
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { correctedValue } = (await req.json()) as { correctedValue: string };

    const extraction = await prisma.extraction.update({
      where: { id: params.id },
      data: {
        correctedByRecruiter: true,
        correctedValue,
        correctedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "extraction.corrected",
        targetType: "Extraction",
        targetId: extraction.id,
        metadata: { fieldName: extraction.fieldName, correctedValue },
      },
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Erreur correction extraction :", error);
    return NextResponse.json({ error: "Erreur lors de la correction." }, { status: 500 });
  }
}