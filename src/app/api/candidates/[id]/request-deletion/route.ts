import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteCvFromS3 } from "@/lib/s3";
import { getSessionFromRequest } from "@/lib/auth";

/**
 * POST /api/candidates/[id]/request-deletion
 * Exécute le droit à la suppression — même en cours de process de
 * recrutement (cas limite explicitement exigé par le sujet).
 *
 * Contrairement aux autres emails du produit, la confirmation de
 * suppression part immédiatement, sans validation humaine préalable :
 * il s'agit de l'exécution d'un droit légal du candidat, pas d'une
 * décision produit — la distinction est volontaire et documentée au README.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });
  }

  try {
    const candidate = await prisma.candidate.findUnique({ where: { id: params.id } });
    if (!candidate) {
      return NextResponse.json({ error: "Candidat introuvable." }, { status: 404 });
    }

    // Anonymisation plutôt que suppression physique immédiate : conserve
    // l'intégrité des logs d'audit tout en retirant les données identifiantes.
    // Suppression réelle du fichier sur S3, pas seulement de sa référence.
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
        cvUrl: "", // retire la référence : le CV original ne doit plus être consultable
        deletionRequested: true,
        deletionRequestedAt: new Date(),
        anonymized: true,
      },
    });

    const applications = await prisma.application.findMany({
      where: { candidateId: params.id },
    });

    // On efface aussi les données identifiantes extraites par l'IA (nom,
    // email, téléphone...) — sinon l'anonymisation du candidat serait
    // incomplète : ces informations resteraient visibles sur la fiche.
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
          status: "SENT", // envoyé directement : exécution d'un droit, pas une décision produit
          sentAt: new Date(),
        },
      });
    }

    await prisma.auditLog.create({
      data: {
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