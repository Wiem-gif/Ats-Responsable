import OpenAI from "openai";

// Groq expose une API compatible avec le SDK OpenAI : il suffit de changer
// la baseURL et la clé pour basculer dessus, gratuitement.
const useGroq = Boolean(process.env.GROQ_API_KEY);

const openai = new OpenAI({
  apiKey: useGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY,
  baseURL: useGroq ? "https://api.groq.com/openai/v1" : undefined,
});

const MODEL =
  process.env.OPENAI_MODEL ?? (useGroq ? "llama-3.3-70b-versatile" : "gpt-4o-mini");



export type ExtractedField = {
  fieldName: string;
  value: string | null;
  quote: string | null;
};

const EXTRACTION_SYSTEM_PROMPT = `
Tu es un outil d'EXTRACTION FACTUELLE de CV, pas un évaluateur.
Règles strictes :
- N'invente JAMAIS une information absente du texte. Si tu ne trouves pas un champ, renvoie value: null et quote: null.
- Pour chaque champ trouvé, "quote" doit être une citation EXACTE et COURTE (max 15 mots) copiée telle quelle du CV, permettant de localiser l'information dans le texte source.
- Ne donne aucune opinion, aucun jugement de qualité, aucune note.
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balises markdown.

Format de sortie attendu :
{
  "full_name": { "value": "...", "quote": "..." },
  "email": { "value": "...", "quote": "..." },
  "phone": { "value": "...", "quote": "..." },
  "years_experience": { "value": "...", "quote": "..." },
  "last_position": { "value": "...", "quote": "..." },
  "skills": [{ "value": "...", "quote": "..." }],
  "education": [{ "value": "...", "quote": "..." }],
  "languages": [{ "value": "...", "quote": "..." }]
}
`.trim();

export async function extractFactsFromCv(cvText: string) {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: `Texte du CV :\n\n${cvText}` },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------

export type CriterionMatchResult = {
  criterion: string;
  status: "FOUND" | "NOT_FOUND" | "UNCERTAIN";
  quote: string | null;
};

const MATCHING_SYSTEM_PROMPT = `
Tu compares une liste de critères de poste au texte d'un CV.
Pour CHAQUE critère, réponds par un statut parmi : "FOUND", "NOT_FOUND", "UNCERTAIN".
- "FOUND" : le CV mentionne clairement cet élément. Fournis une citation exacte (quote) du CV.
- "NOT_FOUND" : rien dans le CV ne permet de confirmer ce critère. Ne pas déduire, ne pas supposer.
- "UNCERTAIN" : il y a une mention partielle ou ambiguë, insuffisante pour conclure clairement.
Tu ne donnes JAMAIS de score global ni de recommandation d'embauche.
Réponds UNIQUEMENT en JSON, sous la forme :
{ "matches": [{ "criterion": "...", "status": "FOUND", "quote": "..." }] }
`.trim();

export async function matchCriteriaToCv(cvText: string, criteria: string[]) {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: MATCHING_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Critères du poste :\n${criteria.map((c) => `- ${c}`).join("\n")}\n\nTexte du CV :\n\n${cvText}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  return (parsed.matches ?? []) as CriterionMatchResult[];
}

// ---------------------------------------------------------------------------

const QUESTIONS_SYSTEM_PROMPT = `
Tu proposes des questions d'entretien factuelles et techniques pour un recruteur.
Priorise les questions qui permettent de clarifier les critères marqués "NOT_FOUND"
ou "UNCERTAIN", et complète avec des questions sur les points forts identifiés.
Évite les questions RH génériques ("pourquoi voulez-vous nous rejoindre").
Propose entre 3 et 5 questions. Pour chaque question, indique brièvement sur quoi
elle s'appuie ("based_on").
Réponds UNIQUEMENT en JSON :
{ "questions": [{ "question_text": "...", "based_on": "..." }] }
`.trim();

export async function suggestInterviewQuestions(
  cvText: string,
  criteriaResults: CriterionMatchResult[]
) {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: QUESTIONS_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Résultats du rapprochement critères :\n${JSON.stringify(
          criteriaResults,
          null,
          2
        )}\n\nTexte du CV :\n\n${cvText}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  return (parsed.questions ?? []) as { question_text: string; based_on: string }[];
}
