import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/interviews/[id]
 * Le recruteur saisit un retour d'entretien -> l'entretien passe à COMPLETED
 * et la candidature avance à l'étape "Entretien fait" (W2, étape "tâche feedback").
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { feedbackText } = (await req.json()) as { feedbackText: string };

    const interview = await prisma.interview.update({
      where: { id: params.id },
      data: {
        feedbackText,
        feedbackSubmittedAt: new Date(),
        status: "COMPLETED",
      },
    });

    await prisma.application.update({
      where: { id: interview.applicationId },
      data: { stage: "INTERVIEW_DONE" },
    });

    await prisma.auditLog.create({
      data: {
        action: "interview.feedback_submitted",
        targetType: "Interview",
        targetId: interview.id,
      },
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Erreur enregistrement feedback :", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}