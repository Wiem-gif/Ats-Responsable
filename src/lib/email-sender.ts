import nodemailer from "nodemailer";

const SUBJECT_BY_TYPE: Record<string, string> = {
  INVITATION: "Invitation à un entretien",
  REMINDER: "Rappel : entretien demain",
  FOLLOW_UP: "Suite à votre candidature",
  DELETION_CONFIRMATION: "Confirmation de suppression de vos données",
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendEmail(params: { to: string; type: string; text: string }) {
  console.log("--- Tentative d'envoi email ---");
  console.log("GMAIL_USER défini :", Boolean(process.env.GMAIL_USER), process.env.GMAIL_USER);
  console.log("GMAIL_APP_PASSWORD défini :", Boolean(process.env.GMAIL_APP_PASSWORD));
  console.log("Destinataire :", params.to);

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("GMAIL_USER / GMAIL_APP_PASSWORD non configurés : envoi ignoré (mode simulation).");
    return { simulated: true };
  }

  if (!params.to) {
    console.error("Aucune adresse destinataire fournie — envoi annulé.");
    throw new Error("Adresse destinataire manquante.");
  }

  try {
    const result = await transporter.sendMail({
      from: `"Équipe recrutement" <${process.env.GMAIL_USER}>`,
      to: params.to,
      subject: SUBJECT_BY_TYPE[params.type] ?? "Message de l'équipe recrutement",
      text: params.text,
    });

    console.log("Résultat envoi : messageId =", result.messageId);
    console.log("Accepted :", result.accepted);
    console.log("Rejected :", result.rejected);

    return result;
  } catch (err) {
    console.error("ERREUR nodemailer complète :", err);
    throw err;
  }
}