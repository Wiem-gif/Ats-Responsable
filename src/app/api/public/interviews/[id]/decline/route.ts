import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateEmailDraft } from "@/lib/email-drafts";
import { sendEmail } from "@/lib/email-sender";

/**
 * POST /api/public/interviews/[id]/decline
 * Route publique — accessible depuis le lien dans l'email d'invitation.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const interview = await prisma.interview.findUnique({
      where: { id: params.id },
      include: { application: { include: { candidate: true, job: true } } },
    });

    if (!interview) {
      return NextResponse.json({ error: "Entretien introuvable." }, { status: 404 });
    }

    if (interview.status === "DECLINED") {
      return NextResponse.json({ status: "already_declined" });
    }

    await prisma.interview.update({
      where: { id: params.id },
      data: { status: "DECLINED" },
    });

    await prisma.auditLog.create({
      data: {
        action: "interview.declined",
        targetType: "Interview",
        targetId: interview.id,
      },
    });

    const draftText = await generateEmailDraft({
      type: "follow_up",
      candidateName: interview.application.candidate.fullName,
      jobTitle: interview.application.job.title,
      daysSinceLastUpdate: 0,
    });

    await prisma.emailDraft.create({
      data: {
        applicationId: interview.applicationId,
        type: "FOLLOW_UP",
        draftText: `${draftText}\n\n(Suite à un entretien décliné — proposer un nouveau créneau.)`,
        status: "PENDING_REVIEW",
      },
    });

    // Notification réelle au recruteur — pas seulement un enregistrement
    // silencieux en base, pour qu'il soit effectivement alerté sans avoir
    // à consulter /drafts de façon proactive.
    if (process.env.NOTIFICATION_EMAIL) {
      const draftsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/drafts`;
      sendEmail({
        to: process.env.NOTIFICATION_EMAIL,
        type: "INTERNAL_NOTIFICATION",
        text: `${interview.application.candidate.fullName} a décliné son entretien pour le poste "${interview.application.job.title}".\n\nUn brouillon de relance a été généré et attend ta validation :\n${draftsUrl}`,
      }).catch((err) => console.error("Erreur notification recruteur (non bloquant) :", err));
    }

    return NextResponse.json({ status: "declined" });
  } catch (error) {
    console.error("Erreur refus entretien :", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}