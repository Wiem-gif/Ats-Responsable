import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateEmailDraft } from "@/lib/email-drafts";

/**
 * GET /api/cron/relances
 * Déclenché par le workflow n8n W3 (Schedule Trigger + HTTP Request).
 *
 * Cherche les candidatures qui n'ont pas bougé depuis N jours (5 en
 * production, quelques minutes en DEMO_MODE pour pouvoir tout montrer
 * en vidéo sans attendre) et génère un brouillon de relance — jamais
 * envoyé automatiquement, toujours en attente de validation sur /drafts.
 *
 * Protégé par un secret partagé pour éviter qu'un appel public déclenche
 * des générations IA à volonté.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const isDemoMode = process.env.DEMO_MODE === "true";
  const thresholdMs = isDemoMode
    ? 3 * 60 * 1000 // 3 minutes en mode démo, pour pouvoir tout montrer rapidement
    : 5 * 24 * 60 * 60 * 1000; // 5 jours en production

  const staleApplications = await prisma.application.findMany({
    where: {
      stage: { notIn: ["DECIDED"] },
      updatedAt: { lt: new Date(Date.now() - thresholdMs) },
    },
    include: { candidate: true, job: true, emailDrafts: true },
  });

  const created: string[] = [];

  for (const app of staleApplications) {
    // Évite de spammer : pas de nouvelle relance si une relance est déjà
    // en attente ou a déjà été envoyée récemment pour cette candidature.
    const alreadyHasFollowUp = app.emailDrafts.some(
      (d) => d.type === "FOLLOW_UP" && d.status !== "DISCARDED"
    );
    if (alreadyHasFollowUp) continue;

    const daysSince = Math.floor((Date.now() - app.updatedAt.getTime()) / (24 * 60 * 60 * 1000));

    const draftText = await generateEmailDraft({
      type: "follow_up",
      candidateName: app.candidate.fullName,
      jobTitle: app.job.title,
      daysSinceLastUpdate: isDemoMode ? 5 : daysSince,
    });

    const draft = await prisma.emailDraft.create({
      data: {
        applicationId: app.id,
        type: "FOLLOW_UP",
        draftText,
        status: "PENDING_REVIEW",
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "followup.draft_generated",
        targetType: "Application",
        targetId: app.id,
      },
    });

    created.push(draft.id);
  }

  return NextResponse.json({ checked: staleApplications.length, draftsCreated: created.length });
}