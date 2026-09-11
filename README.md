# ATS Responsable — Test technique F3

Suivi de candidatures qui résume les CV avec l'IA et aide à préparer l'entretien,
**sans jamais décider à la place du recruteur.**

## Principes du projet

- Aucun score global, aucun rejet automatique.
- Chaque extraction de l'IA est reliée à une citation exacte du CV source (traçabilité).
- Aucun email n'est envoyé sans validation humaine préalable.
- Le recruteur peut corriger toute extraction erronée.
- Le candidat peut demander la suppression de ses données à tout moment.

## Stack

- **Next.js 14** (App Router, TypeScript) — frontend + API routes
- **PostgreSQL + Prisma** — base de données
- **S3** — stockage des CV (accès via URLs signées, bucket privé)
- **pdf-parse (+ fallback OCR)** — extraction du texte des CV
- **OpenAI API** — extraction factuelle / rapprochement critères / questions suggérées (3 appels séparés)
- **n8n** — orchestration des workflows (ingestion, planification d'entretien, relances)
- **Google Calendar API** — création d'événements d'entretien

## Installation

```bash
# 1. Cloner le projet et installer les dépendances
npm install

# 2. Copier le fichier d'environnement et renseigner tes propres clés
cp .env.example .env

# 3. Générer le client Prisma et appliquer le schéma
npx prisma generate
npx prisma migrate dev --name init

# 4. Charger le jeu de données de démo
npm run seed

# 5. Lancer le serveur de développement
npm run dev
```

L'app est disponible sur http://localhost:3000

## Structure du projet

```
src/
  app/                  → pages et routes API (App Router)
    api/upload/         → réception d'un CV, déclenche le pipeline d'ingestion
    api/webhooks/extract/ → appelé par n8n, exécute les 3 appels IA
  lib/
    ai-extraction.ts    → les 3 fonctions IA (extraction / matching / questions)
    cv-parser.ts        → extraction texte PDF + fallback OCR + dédoublonnage
    prisma.ts           → client Prisma singleton
    s3.ts                → upload / lecture sécurisée des CV
prisma/
  schema.prisma         → modèle de données complet
  seed.ts               → jeu de données de démo
```

## Choix techniques (à compléter au fil du build)

- **3 appels IA séparés** plutôt qu'un seul gros prompt : chaque responsabilité
  (extraction / matching / questions) est isolée, plus facile à tester et à déboguer.
- **n8n orchestration, logique métier dans Next.js** : n8n gère le temporel
  (webhooks, délais, emails) ; toute la logique IA reste versionnée dans le code.
- **Bucket S3 privé + URLs signées** : cohérent avec l'exigence de confidentialité
  des données candidat.

## Limites connues

- (à compléter en fin de build — sois honnête, c'est valorisé dans la grille de notation)

## Démo

- Vidéo : (lien à ajouter)
- Jeu de données de démo : `prisma/seed.ts`
