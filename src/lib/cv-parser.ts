import { extractText, getDocumentProxy } from "unpdf";
import crypto from "crypto";

const MIN_TEXT_LENGTH = 50; // en dessous, on considère le PDF comme "sans texte exploitable"

export type CvParseResult = {
  text: string;
  status: "SUCCESS" | "FAILED";
  method: "pdf-text" | "ocr" | "none";
};

/**
 * Tente d'extraire le texte d'un CV PDF via unpdf (moteur PDF moderne,
 * activement maintenu — contrairement à pdf-parse qui embarque une version
 * de pdf.js datant de 2017 et échoue sur des PDF pourtant valides).
 * Étape 1 : extraction directe du texte du PDF (rapide, gratuit).
 * Étape 2 (si échec / texte trop court) : OCR via OCR.space.
 */
export async function parseCvText(buffer: Buffer): Promise<CvParseResult> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    const cleanedText = (text ?? "").trim();

    if (cleanedText.length >= MIN_TEXT_LENGTH) {
      return { text: cleanedText, status: "SUCCESS", method: "pdf-text" };
    }

    // Texte insuffisant → probablement un CV scanné (image). On tente l'OCR.
    const ocrText = await runOcrFallback(buffer);
    if (ocrText && ocrText.trim().length >= MIN_TEXT_LENGTH) {
      return { text: ocrText.trim(), status: "SUCCESS", method: "ocr" };
    }

    return { text: "", status: "FAILED", method: "none" };
  } catch (error) {
    console.error("Erreur lors du parsing du CV :", error);

    // Le PDF n'a pas pu être lu du tout (fichier corrompu, protégé...) :
    // on tente quand même l'OCR en dernier recours avant d'abandonner.
    const ocrText = await runOcrFallback(buffer);
    if (ocrText && ocrText.trim().length >= MIN_TEXT_LENGTH) {
      return { text: ocrText.trim(), status: "SUCCESS", method: "ocr" };
    }

    return { text: "", status: "FAILED", method: "none" };
  }
}

/**
 * Fallback OCR via l'API cloud OCR.space (gratuite, sans dépendance système).
 */
async function runOcrFallback(buffer: Buffer): Promise<string> {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    console.warn("OCR_SPACE_API_KEY non configurée : fallback OCR ignoré.");
    return "";
  }

  try {
    const formData = new FormData();
    formData.append("apikey", apiKey);
    formData.append("language", "fre");
    formData.append("isOverlayRequired", "false");
    formData.append("OCREngine", "2");
    formData.append(
      "file",
      new Blob([new Uint8Array(buffer)], { type: "application/pdf" }),
      "cv.pdf"
    );

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.IsErroredOnProcessing) {
      console.error("Erreur OCR.space :", data.ErrorMessage);
      return "";
    }

    const text = (data.ParsedResults ?? [])
      .map((r: { ParsedText: string }) => r.ParsedText)
      .join("\n");

    return text;
  } catch (error) {
    console.error("Erreur lors de l'appel à l'API OCR :", error);
    return "";
  }
}

/**
 * Hash de dédoublonnage : basé sur email + nom normalisés.
 */
export function computeDedupeHash(fullName: string, email: string): string {
  const normalized = `${fullName.trim().toLowerCase()}|${email.trim().toLowerCase()}`;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}