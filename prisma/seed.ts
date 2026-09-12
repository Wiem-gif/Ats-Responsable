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
    create: { name: "Admin Démo", email: "admin@example.com", passwordHash: adminPasswordHash, role: "ADMIN" },
  });

  const recruiter = await prisma.user.upsert({
    where: { email: "recruteur@example.com" },
    update: {},
    create: { name: "Sami Recruteur", email: "recruteur@example.com", passwordHash: recruiterPasswordHash, role: "RECRUITER" },
  });

  console.log("Comptes : admin@example.com / admin123, recruteur@example.com / recruteur123");

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

  // --- Candidat 1 : profil complet, en présélection --------------------------
  const c1Hash = computeDedupeHash("Nour Gharbi", "nour.gharbi@example.com");
  const candidate1 = await prisma.candidate.create({
    data: {
      fullName: "Nour Gharbi",
      email: "nour.gharbi@example.com",
      cvUrl: `cvs/demo-${c1Hash}.pdf`,
      dedupeHash: c1Hash,
      consentGiven: true,
      consentDate: new Date(),
    },
  });
  const app1 = await prisma.application.create({
    data: { candidateId: candidate1.id, jobId: job.id, stage: "SCREENING", ownerId: recruiter.id, extractionStatus: "SUCCESS" },
  });
  await prisma.extraction.createMany({
    data: [
      { applicationId: app1.id, fieldName: "full_name", value: "Nour Gharbi", sourceQuote: "Nour Gharbi" },
      { applicationId: app1.id, fieldName: "years_experience", value: "3", sourceQuote: "3 ans d'expérience" },
      { applicationId: app1.id, fieldName: "last_position", value: "Développeuse Fullstack", sourceQuote: "Développeuse Fullstack — TechNova" },
    ],
  });
  for (const [label, status, quote] of [
    ["React / Next.js", "FOUND", "React, Next.js"],
    ["Node.js", "FOUND", "Node.js, Express"],
    ["3 ans d'expérience minimum", "FOUND", "3 ans d'expérience"],
    ["Expérience avec des LLM / IA générative", "UNCERTAIN", null],
  ] as const) {
    const criterion = job.criteria.find((c) => c.label === label)!;
    await prisma.criteriaMatch.create({
      data: { applicationId: app1.id, criterionId: criterion.id, status, evidenceQuote: quote },
    });
  }
  await prisma.suggestedQuestion.create({
    data: {
      applicationId: app1.id,
      questionText: "Pouvez-vous détailler une intégration IA générative que vous avez menée ?",
      basedOn: "Critère IA générative marqué incertain",
    },
  });

  // --- Candidat 2 : CV sans texte exploitable (cas limite) --------------------
  const c2Hash = computeDedupeHash("Karim Trabelsi", "karim.trabelsi@example.com");
  const candidate2 = await prisma.candidate.create({
    data: {
      fullName: "Karim Trabelsi",
      email: "karim.trabelsi@example.com",
      cvUrl: `cvs/demo-${c2Hash}.pdf`,
      dedupeHash: c2Hash,
      consentGiven: true,
      consentDate: new Date(),
    },
  });
  await prisma.application.create({
    data: { candidateId: candidate2.id, jobId: job.id, stage: "RECEIVED", ownerId: recruiter.id, extractionStatus: "FAILED" },
  });

  // --- Candidat 3 : entretien planifié puis décliné (cas limite) --------------
  const c3Hash = computeDedupeHash("Aïcha Ben Salah", "aicha.bensalah@example.com");
  const candidate3 = await prisma.candidate.create({
    data: {
      fullName: "Aïcha Ben Salah",
      email: "aicha.bensalah@example.com",
      cvUrl: `cvs/demo-${c3Hash}.pdf`,
      dedupeHash: c3Hash,
      consentGiven: true,
      consentDate: new Date(),
    },
  });
  const app3 = await prisma.application.create({
    data: { candidateId: candidate3.id, jobId: job.id, stage: "INTERVIEW_SCHEDULED", ownerId: recruiter.id, extractionStatus: "SUCCESS" },
  });
  await prisma.interview.create({
    data: {
      applicationId: app3.id,
      slotDatetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      participants: ["recruteur@example.com"],
      status: "DECLINED",
    },
  });
  await prisma.emailDraft.create({
    data: {
      applicationId: app3.id,
      type: "FOLLOW_UP",
      draftText: "Bonjour Aïcha, suite à votre indisponibilité, pourriez-vous nous proposer un nouveau créneau ? L'équipe recrutement.",
      status: "PENDING_REVIEW",
    },
  });

  // --- Candidat 4 : données déjà supprimées (RGPD), pour montrer l'état final -
  const c4Hash = computeDedupeHash("Ancien Candidat", "ancien@example.com");
  const candidate4 = await prisma.candidate.create({
    data: {
      fullName: "Candidat supprimé",
      email: `deleted-demo-${c4Hash}@anonymized.local`,
      cvUrl: "",
      dedupeHash: c4Hash,
      consentGiven: true,
      consentDate: new Date(),
      deletionRequested: true,
      deletionRequestedAt: new Date(),
      anonymized: true,
    },
  });
  await prisma.application.create({
    data: { candidateId: candidate4.id, jobId: job.id, stage: "SCREENING", ownerId: recruiter.id, extractionStatus: "SUCCESS" },
  });

  console.log("Seed terminé : 4 candidats couvrant les cas limites du sujet.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });