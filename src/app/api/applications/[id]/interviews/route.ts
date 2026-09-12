import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateEmailDraft } from "@/lib/email-drafts";

/**
 * POST /api/applications/[id]/interviews
 * Crée un entretien + génère un brouillon d'invitation (statut PENDING_REVIEW).
 * Aucun email n'est envoyé ici — l'envoi ne se fait que depuis la page
 * de validation des brouillons, après action explicite du recruteur.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { slotDatetime, participants } = (await req.json()) as {
      slotDatetime: string;
      participants: string[];
    };

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: { candidate: true, job: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Candidature introuvable." }, { status: 404 });
    }

    const interview = await prisma.interview.create({
      data: {
        applicationId: application.id,
        slotDatetime: new Date(slotDatetime),
        participants,
        status: "INVITED",
      },
    });

    await prisma.application.update({
      where: { id: application.id },
      data: { stage: "INTERVIEW_SCHEDULED" },
    });

    const draftText = await generateEmailDraft({
      type: "invitation",
      candidateName: application.candidate.fullName,
      jobTitle: application.job.title,
      slotDatetime: new Date(slotDatetime).toLocaleString("fr-FR", {
        dateStyle: "full",
        timeStyle: "short",
      }),
    });

    const emailDraft = await prisma.emailDraft.create({
      data: {
        applicationId: application.id,
        type: "INVITATION",
        draftText,
        status: "PENDING_REVIEW",
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "interview.scheduled",
        targetType: "Interview",
        targetId: interview.id,
      },
    });

    return NextResponse.json({ interviewId: interview.id, emailDraftId: emailDraft.id });
  } catch (error) {
    console.error("Erreur planification entretien :", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}