import OpenAI from "openai";

const useGroq = Boolean(process.env.GROQ_API_KEY);

const openai = new OpenAI({
  apiKey: useGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY,
  baseURL: useGroq ? "https://api.groq.com/openai/v1" : undefined,
});

const MODEL = process.env.OPENAI_MODEL ?? (useGroq ? "openai/gpt-oss-20b" : "gpt-4o-mini");

/**
 * Génère un brouillon d'email — jamais envoyé automatiquement.
 * Le brouillon est toujours créé avec le statut PENDING_REVIEW en base ;
 * c'est le recruteur qui décide de l'envoyer, potentiellement après édition.
 */
export async function generateEmailDraft(params: {
  type: "invitation" | "reminder" | "follow_up";
  candidateName: string;
  jobTitle: string;
  slotDatetime?: string;
  daysSinceLastUpdate?: number;
}): Promise<string> {
  const systemPrompt = `
Tu rédiges un brouillon d'email professionnel, chaleureux mais concis, en français,
pour un processus de recrutement. Le ton est respectueux et direct.
Ne signe pas avec un nom précis, termine par "L'équipe recrutement".
Réponds uniquement avec le texte de l'email, sans objet, sans balises, sans commentaire.
`.trim();

  let userPrompt = "";
  if (params.type === "invitation") {
    userPrompt = `Rédige une invitation à un entretien pour ${params.candidateName}, candidat(e) au poste "${params.jobTitle}", prévu le ${params.slotDatetime}.`;
  } else if (params.type === "reminder") {
    userPrompt = `Rédige un rappel amical d'entretien à venir demain pour ${params.candidateName}, poste "${params.jobTitle}", prévu le ${params.slotDatetime}.`;
  } else {
    userPrompt = `Rédige une relance polie pour ${params.candidateName}, candidat(e) au poste "${params.jobTitle}", sans nouvelle depuis ${params.daysSinceLastUpdate} jours. Demande si le processus l'intéresse toujours, sans pression.`;
  }

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}