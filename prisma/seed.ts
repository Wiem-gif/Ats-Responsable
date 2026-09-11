import { PrismaClient } from "@prisma/client";
import { computeDedupeHash } from "../src/lib/cv-parser";

const prisma = new PrismaClient();

/**
 * Jeu de données de démonstration.
 * Volontairement varié pour illustrer les cas limites du sujet :
 * - un candidat avec extraction complète
 * - un candidat avec critère non trouvé
 * - un candidat en doublon potentiel
 * - un candidat avec échec d'extraction (CV "sans texte")
 */
async function main() {
  console.log("Seed : création du jeu de données de démo...");

  const recruiter = await prisma.user.create({
    data: { name: "Sami Recruteur", email: "sami@example.com", role: "RECRUITER" },
  });

  const job = await prisma.job.create({
    data: {
      title: "Développeur Fullstack IA / Automation",
      description: "Poste orienté Next.js, automatisation de workflows et intégration IA.",
      status: "open",
      criteria: {
        create: [
          { label: "React / Next.js" },
          { label: "Node.js" },
          { label: "3 ans d'expérience minimum" },
          { label: "Expérience avec des LLM / IA générative" },
        ],
      },
    },
    include: { criteria: true },
  });

  const candidatesData = [
    { fullName: "Aïcha Ben Salah", email: "aicha.bensalah@example.com" },
    { fullName: "Karim Trabelsi", email: "karim.trabelsi@example.com" },
    { fullName: "Nour Gharbi", email: "nour.gharbi@example.com" },
  ];

  for (const c of candidatesData) {
    const dedupeHash = computeDedupeHash(c.fullName, c.email);
    const candidate = await prisma.candidate.create({
      data: {
        fullName: c.fullName,
        email: c.email,
        cvUrl: `cvs/demo-${dedupeHash}.pdf`,
        dedupeHash,
        consentGiven: true,
        consentDate: new Date(),
      },
    });

    await prisma.application.create({
      data: {
        candidateId: candidate.id,
        jobId: job.id,
        stage: "RECEIVED",
        ownerId: recruiter.id,
      },
    });
  }

  console.log("Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
