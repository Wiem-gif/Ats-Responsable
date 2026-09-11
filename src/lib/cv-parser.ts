import pdf from "pdf-parse";
import crypto from "crypto";

const MIN_TEXT_LENGTH = 50; // en dessous, on considère le PDF comme "sans texte exploitable"

export type CvParseResult = {
  text: string;
  status: "SUCCESS" | "FAILED";
  method: "pdf-text" | "ocr" | "none";
};

/**
 * Tente d'extraire le texte d'un CV PDF.
 * Étape 1 : extraction directe du texte du PDF (rapide, gratuit).
 * Étape 2 (si échec / texte trop court) : OCR — à brancher avec le service
 * de ton choix (Tesseract.js en local, ou une API OCR managée).
 *
 * Ce fichier isole volontairement le fallback OCR dans sa propre fonction
 * pour pouvoir le tester et le remplacer facilement.
 */
export async function parseCvText(buffer: Buffer): Promise<CvParseResult> {
  try {
    const parsed = await pdf(buffer);
    const text = (parsed.text ?? "").trim();

    if (text.length >= MIN_TEXT_LENGTH) {
      return { text, status: "SUCCESS", method: "pdf-text" };
    }

    // Texte insuffisant → probablement un CV scanné (image). On tente l'OCR.
    const ocrText = await runOcrFallback(buffer);
    if (ocrText && ocrText.trim().length >= MIN_TEXT_LENGTH) {
      return { text: ocrText.trim(), status: "SUCCESS", method: "ocr" };
    }

    return { text: "", status: "FAILED", method: "none" };
  } catch (error) {
    console.error("Erreur lors du parsing du CV :", error);
    return { text: "", status: "FAILED", method: "none" };
  }
}

/**
 * Fallback OCR. Implémentation à compléter (ex: Tesseract.js, ou une API
 * OCR cloud). Renvoie une chaîne vide si non implémenté, ce qui déclenche
 * proprement le statut FAILED côté appelant — jamais de crash silencieux.
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
    formData.append("OCREngine", "2"); // moteur plus précis, meilleur sur les CV
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
 * Volontairement simple (pas de fuzzy matching) pour rester prévisible
 * et explicable — cohérent avec l'exigence "pas de décision automatique".
 */
export function computeDedupeHash(fullName: string, email: string): string {
  const normalized = `${fullName.trim().toLowerCase()}|${email.trim().toLowerCase()}`;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}
