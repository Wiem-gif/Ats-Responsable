import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateEmailDraft } from "@/lib/email-drafts";

/**
 * GET /api/cron/rappels
 * Déclenché par un second workflow n8n (Schedule Trigger + HTTP Request),
 * distinct de W3 (relance). Correspond à l'étape "Rappel J-1" du workflow
 * W2 du sujet.
 *
 * Cherche les entretiens à venir dans les prochaines 24h (quelques minutes
 * en DEMO_MODE) et génère un brouillon de rappel — jamais envoyé sans
 * validation humaine, comme tous les autres emails du produit.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const isDemoMode = process.env.DEMO_MODE === "true";
  const windowMs = isDemoMode
    ? 5 * 60 * 1000 // 5 minutes en mode démo
    : 24 * 60 * 60 * 1000; // 24h en production

  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowMs);

  const upcomingInterviews = await prisma.interview.findMany({
    where: {
      slotDatetime: { gte: now, lte: windowEnd },
      status: { in: ["INVITED", "ACCEPTED"] },
    },
    include: { application: { include: { candidate: true, job: true, emailDrafts: true } } },
  });

  const created: string[] = [];

  for (const interview of upcomingInterviews) {
    // Évite les doublons : pas de nouveau rappel si un rappel est déjà
    // en attente ou déjà envoyé pour cette candidature.
    const alreadyHasReminder = interview.application.emailDrafts.some(
      (d) => d.type === "REMINDER" && d.status !== "DISCARDED"
    );
    if (alreadyHasReminder) continue;

    const draftText = await generateEmailDraft({
      type: "reminder",
      candidateName: interview.application.candidate.fullName,
      jobTitle: interview.application.job.title,
      slotDatetime: interview.slotDatetime.toLocaleString("fr-FR", {
        dateStyle: "full",
        timeStyle: "short",
      }),
    });

    const draft = await prisma.emailDraft.create({
      data: {
        applicationId: interview.applicationId,
        type: "REMINDER",
        draftText,
        status: "PENDING_REVIEW",
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "reminder.draft_generated",
        targetType: "Interview",
        targetId: interview.id,
      },
    });

    created.push(draft.id);
  }

  return NextResponse.json({ checked: upcomingInterviews.length, draftsCreated: created.length });
}