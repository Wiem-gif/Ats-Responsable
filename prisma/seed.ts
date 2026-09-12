import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeDedupeHash } from "../src/lib/cv-parser";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed : création du jeu de données de démo...");

  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const recruiterPasswordHash = await bcrypt.hash("recruteur123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin Démo",
      email: "admin@example.com",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  const recruiter = await prisma.user.upsert({
    where: { email: "recruteur@example.com" },
    update: {},
    create: {
      name: "Sami Recruteur",
      email: "recruteur@example.com",
      passwordHash: recruiterPasswordHash,
      role: "RECRUITER",
    },
  });

  console.log("Comptes créés : admin@example.com / admin123, recruteur@example.com / recruteur123");

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