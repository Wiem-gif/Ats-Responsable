import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadCvToS3 } from "@/lib/s3";
import { parseCvText, computeDedupeHash } from "@/lib/cv-parser";
import { runIngestionPipeline } from "@/lib/ingestion-pipeline";

/**
 * POST /api/upload
 * Reçoit un CV + infos candidat, déclenche le pipeline d'ingestion (W1) :
 * 1. Stockage S3
 * 2. Vérification doublon
 * 3. Extraction du texte (+ fallback OCR)
 * 4. Création des enregistrements en base
 * 5. Notification n8n (webhook) pour la suite du pipeline IA
 *
 
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("cv") as File | null;
    const fullName = formData.get("fullName") as string | null;
    const email = formData.get("email") as string | null;
    const jobId = formData.get("jobId") as string | null;
    const portfolioUrl = (formData.get("portfolioUrl") as string | null) || null;
    const consentGiven = formData.get("consentGiven") === "true";

    if (!file || !fullName || !email || !jobId) {
      return NextResponse.json(
        { error: "Champs requis manquants : cv, fullName, email, jobId." },
        { status: 400 }
      );
    }

    if (!consentGiven) {
      return NextResponse.json(
        { error: "Le consentement du candidat est requis avant tout traitement." },
        { status: 400 }
      );
    }

    // --- 1. Dédoublonnage -------------------------------------------------
    const dedupeHash = computeDedupeHash(fullName, email);
    const existing = await prisma.candidate.findFirst({ where: { dedupeHash, anonymized: false } });

    if (existing) {
      // On ne fusionne jamais automatiquement : on notifie et on laisse
      // la décision au recruteur (voir AuditLog + notif dans une V2).
      await prisma.auditLog.create({
        data: {
          action: "candidate.duplicate_detected",
          targetType: "Candidate",
          targetId: existing.id,
          metadata: { attemptedEmail: email, attemptedName: fullName },
        },
      });
      return NextResponse.json(
        {
          warning: "Un candidat avec des informations similaires existe déjà.",
          existingCandidateId: existing.id,
        },
        { status: 409 }
      );
    }

    // --- 2. Stockage S3 -----------------------------------------------------
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `cvs/${dedupeHash}-${Date.now()}-${file.name}`;
    await uploadCvToS3({ buffer, key, contentType: file.type });

    // --- 3. Création Candidate + Application --------------------------------
    const candidate = await prisma.candidate.create({
      data: {
        fullName,
        email,
        cvUrl: key,
        portfolioUrl,
        dedupeHash,
        consentGiven: true,
        consentDate: new Date(),
      },
    });

    const application = await prisma.application.create({
      data: {
        candidateId: candidate.id,
        jobId,
        stage: "RECEIVED",
      },
    });

    // --- 4. Extraction texte (+ fallback OCR) -------------------------------
    const parseResult = await parseCvText(buffer);

    await prisma.application.update({
      where: { id: application.id },
      data: {
        extractionStatus: parseResult.status === "SUCCESS" ? "SUCCESS" : "FAILED",
      },
    });

    if (parseResult.status === "FAILED") {
      await prisma.auditLog.create({
        data: {
          action: "cv.extraction_failed",
          targetType: "Application",
          targetId: application.id,
        },
      });
      return NextResponse.json({
        applicationId: application.id,
        warning:
          "Le texte du CV n'a pas pu être extrait automatiquement (même après OCR). Une saisie manuelle sera nécessaire.",
      });
    }

    // --- 5. Déclenchement du pipeline IA --------------------------------------
    // En développement, on lance l'extraction directement pour pouvoir tester
    // sans dépendre de n8n. En production, tu peux la remplacer entièrement
    // par l'appel webhook ci-dessous si tu préfères tout faire passer par n8n.
    runIngestionPipeline(application.id, parseResult.text).catch((err) =>
      console.error("Erreur pipeline d'extraction IA (non bloquant) :", err)
    );

    if (process.env.N8N_INGESTION_WEBHOOK_URL) {
      await fetch(process.env.N8N_INGESTION_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: application.id,
          cvText: parseResult.text,
        }),
      }).catch((err) => console.error("Erreur webhook n8n (non bloquant) :", err));
    }

    return NextResponse.json({ applicationId: application.id, status: "received" });
  } catch (error) {
    console.error("Erreur upload CV :", error);
    return NextResponse.json({ error: "Erreur serveur lors du traitement du CV." }, { status: 500 });
  }
}