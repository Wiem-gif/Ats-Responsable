import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();


async function main() {
  const exportDir = path.join(process.cwd(), "exports");
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

  // --- 1. Jeu de données de démo --------------------------------------------
  const jobs = await prisma.job.findMany({
    include: {
      criteria: true,
      applications: {
        include: {
          candidate: true,
          extractions: true,
          criteriaMatches: { include: { criterion: true } },
          suggestedQuestions: true,
          interviews: true,
          emailDrafts: true,
        },
      },
    },
  });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true }, // jamais le passwordHash
  });

  fs.writeFileSync(
    path.join(exportDir, "demo-dataset.json"),
    JSON.stringify({ exportedAt: new Date().toISOString(), users, jobs }, null, 2)
  );

  // --- 2. Description des workflows -----------------------------------------
  const workflows = {
    W1_ingestion: {
      description: "Réception d'un CV et déclenchement du pipeline d'extraction IA.",
      steps: [
        "Upload du CV (stockage S3/Supabase Storage, bucket privé)",
        "Vérification de doublon (hash nom+email normalisés) — pas de fusion automatique",
        "Extraction du texte (unpdf, fallback OCR via OCR.space si nécessaire)",
        "3 appels IA séparés : extraction factuelle / rapprochement critères / questions suggérées",
        "Passage automatique de l'étape 'Reçu' à 'Présélection'",
      ],
      executedBy: "Directement par l'application (appel synchrone), pour la fiabilité de la démo.",
    },
    W2_entretien: {
      description: "Planification d'entretien, rappel J-1, et suivi post-entretien.",
      steps: [
        "Le recruteur choisit un créneau -> génération d'un brouillon d'invitation (IA)",
        "Validation humaine obligatoire avant tout envoi (page /drafts)",
        "Un lien de refus est inclus dans l'invitation -> le candidat peut décliner sans compte",
        "n8n (Schedule Trigger) vérifie périodiquement les entretiens proches -> génère un rappel J-1",
        "Après l'entretien : le recruteur saisit un feedback -> passage à 'Entretien fait'",
        "Décision finale (texte libre, jamais un score) -> passage à 'Décidé'",
      ],
      executedBy: "Application (logique métier) + n8n (déclenchement temporel du rappel).",
      n8nEndpoint: "GET /api/cron/rappels (protégé par CRON_SECRET)",
    },
    W3_relance: {
      description: "Détection des candidatures sans mise à jour depuis 5 jours et relance.",
      steps: [
        "n8n (Schedule Trigger) appelle périodiquement l'endpoint de relance",
        "L'application identifie les candidatures stagnantes (pas de doublon de relance)",
        "Génération d'un brouillon de relance (IA)",
        "Validation humaine obligatoire avant envoi",
      ],
      executedBy: "n8n (déclenchement) + Application (logique et envoi).",
      n8nEndpoint: "GET /api/cron/relances (protégé par CRON_SECRET)",
    },
    suppression_rgpd: {
      description: "Exécution du droit à la suppression, même en cours de process.",
      steps: [
        "Demande initiée par un Admin depuis la fiche candidat",
        "Suppression réelle du CV sur le stockage (pas seulement la référence)",
        "Suppression des extractions IA liées (données identifiantes)",
        "Anonymisation du candidat (nom, email) — la ligne reste pour l'intégrité des logs d'audit",
        "Confirmation envoyée immédiatement (exécution d'un droit, pas une décision produit)",
      ],
      executedBy: "Application uniquement, réservé au rôle Admin.",
    },
  };

  fs.writeFileSync(path.join(exportDir, "workflows.json"), JSON.stringify(workflows, null, 2));

  console.log("Export terminé : exports/demo-dataset.json et exports/workflows.json");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });