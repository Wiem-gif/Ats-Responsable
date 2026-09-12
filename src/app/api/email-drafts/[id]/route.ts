import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email-sender";

/**
 * PATCH /api/email-drafts/[id]
 * Body : { action: "approve" | "discard", editedText?: string }
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { action, editedText } = (await req.json()) as {
      action: "approve" | "discard";
      editedText?: string;
    };

    if (action === "discard") {
      await prisma.emailDraft.update({
        where: { id: params.id },
        data: { status: "DISCARDED" },
      });
      return NextResponse.json({ status: "discarded" });
    }

    const existingDraft = await prisma.emailDraft.findUnique({
      where: { id: params.id },
      include: { application: { include: { candidate: true } } },
    });

    if (!existingDraft) {
      return NextResponse.json({ error: "Brouillon introuvable." }, { status: 404 });
    }

    const finalText = editedText ?? existingDraft.draftText;

    // --- Envoi réel de l'email --------------------------------------------
    try {
      await sendEmail({
        to: existingDraft.application.candidate.email,
        type: existingDraft.type,
        text: finalText,
      });
    } catch (sendError) {
      console.error("Erreur envoi email :", sendError);
      return NextResponse.json(
        { error: "L'email n'a pas pu être envoyé. Le brouillon reste en attente." },
        { status: 500 }
      );
    }

    const draft = await prisma.emailDraft.update({
      where: { id: params.id },
      data: {
        status: "SENT",
        draftText: finalText,
        sentAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "email.sent",
        targetType: "EmailDraft",
        targetId: draft.id,
        metadata: { type: draft.type, to: existingDraft.application.candidate.email },
      },
    });

    return NextResponse.json({ status: "sent" });
  } catch (error) {
    console.error("Erreur traitement brouillon email :", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}