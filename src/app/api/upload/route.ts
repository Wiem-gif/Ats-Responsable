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
 * 5. Extraction IA (appelée directement ici pour le debug ;
 *    passera en arrière-plan une fois validée)
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("cv") as File | null;
    const fullName = formData.get("fullName") as string | null;
    const email = formData.get("email") as string | null;
    const jobId = formData.get("jobId") as string | null;
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
    const existing = await prisma.candidate.findFirst({ where: { dedupeHash } });

    if (existing) {
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

    // --- 5. Extraction IA (synchrone pour le moment, le temps du debug) -----
    try {
      await runIngestionPipeline(application.id, parseResult.text);
    } catch (err) {
      console.error("Erreur pipeline d'extraction IA :", err);
      return NextResponse.json(
        {
          error:
            "Erreur lors de l'extraction IA : " +
            (err instanceof Error ? err.message : String(err)),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ applicationId: application.id, status: "received" });
  } catch (error) {
    console.error("Erreur upload CV :", error);
    return NextResponse.json({ error: "Erreur serveur lors du traitement du CV." }, { status: 500 });
  }
}