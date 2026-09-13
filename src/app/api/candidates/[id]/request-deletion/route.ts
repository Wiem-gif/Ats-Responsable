import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteCvFromS3 } from "@/lib/s3";
import { getSessionFromRequest } from "@/lib/auth";

/**
 * POST /api/candidates/[id]/request-deletion
 * Exécute le droit à la suppression — même en cours de process de
 * recrutement (cas limite explicitement exigé par le sujet).
 *
 * Ouvert aux deux rôles (Admin et Recruteur) : le RGPD exige une exécution
 * sans délai excessif, restreindre à l'Admin créerait un risque de
 * non-conformité si le recruteur en contact avec le candidat ne peut pas
 * agir. La protection vient de la traçabilité (actorId dans AuditLog),
 * pas de la restriction d'accès.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  try {
    const candidate = await prisma.candidate.findUnique({ where: { id: params.id } });
    if (!candidate) {
      return NextResponse.json({ error: "Candidat introuvable." }, { status: 404 });
    }

    await deleteCvFromS3(candidate.cvUrl).catch((err) =>
      console.error("Erreur suppression CV sur S3 (non bloquant) :", err)
    );

    await prisma.candidate.update({
      where: { id: params.id },
      data: {
        fullName: "Candidat supprimé",
        email: `deleted-${candidate.id}@anonymized.local`,
        phone: null,
        portfolioUrl: null,
        cvUrl: "",
        deletionRequested: true,
        deletionRequestedAt: new Date(),
        anonymized: true,
      },
    });

    const applications = await prisma.application.findMany({
      where: { candidateId: params.id },
    });

    for (const app of applications) {
      await prisma.extraction.deleteMany({ where: { applicationId: app.id } });
    }

    for (const app of applications) {
      await prisma.emailDraft.create({
        data: {
          applicationId: app.id,
          type: "DELETION_CONFIRMATION",
          draftText:
            "Bonjour,\n\nConformément à votre demande, l'ensemble de vos données personnelles a été supprimé de notre système. Votre candidature ne sera plus traitée.\n\nL'équipe recrutement",
          status: "SENT",
          sentAt: new Date(),
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: "candidate.deletion_executed",
        targetType: "Candidate",
        targetId: params.id,
      },
    });

    return NextResponse.json({ status: "deleted" });
  } catch (error) {
    console.error("Erreur suppression RGPD :", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}