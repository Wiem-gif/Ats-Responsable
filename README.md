# ATS Responsable

Suivi de candidatures qui résume les CV avec l'IA et aide à préparer l'entretien —
**sans jamais décider à la place du recruteur.**

**Démo en ligne :** https://ats-responsable.vercel.app

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | `admin@example.com` | `admin123` |
| Recruteur | `recruteur@example.com` | `recruteur123` |



## Principes du projet

- Aucun score global, aucun rejet automatique. L'IA constate, elle ne juge jamais.
- Chaque information extraite est reliée à une citation exacte du CV source (traçabilité).
- Toute extraction erronée peut être corrigée manuellement par le recruteur.
- Aucun email ne part sans validation humaine explicite (page `/drafts`).
- Un candidat peut demander la suppression de ses données à tout moment, même en cours de process.
- Si le CV ne peut être lu automatiquement (même après OCR), une saisie manuelle prend le relais —
  et sert de base au rapprochement critères et aux questions suggérées.

## Rôles et accès

| Action | Admin | Recruteur | Justification |
|---|---|---|---|
| Traiter les candidatures (upload, entretiens, emails, décisions) | ✅ | ✅ | Travail quotidien |
| Créer un poste | ✅ | ✅ | Action réversible, sans enjeu de conformité |
| Exécuter une suppression RGPD | ✅ | ✅ | Le RGPD exige une exécution sans délai excessif ; restreindre à l'Admin créerait un risque de non-conformité si le recruteur en contact avec le candidat ne peut pas agir. La protection vient de la **traçabilité** (chaque suppression enregistre l'auteur dans `AuditLog`), pas de la restriction d'accès. |
| Créer des comptes utilisateurs | ✅ | ❌ | Décision d'organisation, à dessein réservée |

## Stack technique

- **Next.js 14** (App Router, TypeScript) — frontend + API routes
- **PostgreSQL (Supabase) + Prisma** — base de données
- **Supabase Storage** (compatible API S3) — stockage privé des CV
- **unpdf** — extraction du texte des CV, avec fallback **OCR.space** pour les CV scannés
- **Groq API** (modèles `openai/gpt-oss-20b`) — extraction factuelle, rapprochement critères, génération de brouillons d'email
- **n8n** — orchestration temporelle (rappels J-1, relances à 5 jours)
- **Nodemailer + Gmail SMTP** — envoi réel des emails validés
- **jose + bcryptjs** — authentification par session (JWT signé, cookie httpOnly), sans dépendance à compilation native

## Installation locale

```bash
npm install
cp .env.example .env
# renseigner les vraies valeurs dans .env

npm run prisma:generate
npm run prisma:migrate
npm run seed

npm run dev
```

L'app est disponible sur http://localhost:3000 — redirige automatiquement vers `/login`.

## Variables d'environnement

Voir `.env.example`. Points d'attention :

- **`DATABASE_URL`** : utiliser l'URL du **pooler** Supabase (`pooler.supabase.com:6543`), pas la connexion directe — nécessaire pour un environnement serverless (Vercel).
- **`AUTH_SECRET`** : chaîne aléatoire longue, signe les sessions.
- **`CRON_SECRET`** : protège les endpoints `/api/cron/*` appelés par n8n.
- **`GMAIL_USER` / `GMAIL_APP_PASSWORD`** : compte Gmail dédié, mot de passe d'application (validation en 2 étapes requise).

## Architecture des workflows

### W1 — Ingestion d'un CV
```
Upload -> Stockage privé (Supabase Storage) -> Dédoublonnage (hash nom+email)
       -> Extraction texte (unpdf, fallback OCR)
       -> Si échec total : saisie manuelle par le recruteur (sert de base à l'IA ensuite)
       -> 3 appels IA séparés : extraction factuelle / critères / questions
       -> Passage automatique "Reçu" -> "Présélection"
```
Exécuté directement par l'application (appel synchrone), pour la fiabilité de la démo.

### W2 — Entretien
```
Planification -> Brouillon d'invitation (IA) -> Validation humaine (/drafts)
Lien de refus inclus -> page publique /public/interviews/[id]/decline (sans compte)
n8n (/api/cron/rappels) -> détecte les entretiens proches -> brouillon de rappel J-1
Après l'entretien -> feedback du recruteur -> "Entretien fait"
Décision finale (texte libre, jamais un score) -> "Décidé"
```

### W3 — Relance
```
n8n (/api/cron/relances) -> candidatures sans mise à jour depuis 5 jours
-> brouillon de relance -> validation humaine avant envoi
```

**n8n orchestre le temporel, jamais la logique métier** : les endpoints `/api/cron/*` contiennent toute la logique (versionnée, testable) ; n8n se contente de les déclencher à intervalle régulier via HTTP, protégé par `CRON_SECRET`.

### Suppression RGPD
```
Demande (Admin ou Recruteur) -> suppression réelle du CV sur le stockage
-> suppression des extractions IA liées -> anonymisation du candidat
-> confirmation envoyée immédiatement (exécution d'un droit, pas une décision produit)
-> action tracée avec l'identité de l'auteur dans AuditLog
```

## Cas limites gérés

| Cas | Comportement |
|---|---|
| CV sans texte exploitable | Fallback OCR ; si échec aussi, saisie manuelle proposée sur la fiche candidat |
| Candidat en doublon | Détection par hash nom+email ; jamais de fusion automatique |
| Critère non présent | Affiché neutre (`NOT_FOUND`), jamais interprété négativement |
| Invitation refusée | Lien public de refus -> notification email au recruteur + brouillon de relance |
| Suppression pendant le process | Traitée à tout moment, quel que soit le stage |

## Choix techniques notables

- **Authentification maison (jose + bcryptjs)** plutôt que NextAuth : compatibles Edge Runtime sans compilation native.
- **Pas d'auto-inscription publique** : seul un Admin crée des comptes (`/admin/users`).
- **RGPD par anonymisation** plutôt que suppression physique : préserve l'intégrité des journaux d'audit.
- **3 appels IA séparés** (extraction / matching / questions) : chaque responsabilité isolée et testable.
- **Accès par rôle calibré sur le risque de l'action**, pas de façon uniforme : la suppression RGPD reste ouverte aux deux rôles opérationnels pour respecter les délais légaux, la gestion des comptes reste seule restreinte.

## Limites connues

- Pas de synchronisation avec un calendrier externe (Google Calendar) — date/heure stockées en base uniquement.
- Envoi d'email via un compte Gmail standard (limite 500/jour) — à remplacer par un service transactionnel dédié en production réelle.
- Le lien de refus d'entretien utilise l'identifiant de l'entretien, non signé cryptographiquement.
- Pas de notes privées/partagées ni de grille d'entretien structurée.


## Exports

```bash
npm run export:demo
```
Génère `exports/demo-dataset.json` et `exports/workflows.json`.

## Structure du projet

```
src/
  middleware.ts              -> protection des routes par session
  lib/
    auth.ts                  -> session (jose), mots de passe (bcryptjs)
    ai-extraction.ts         -> les 3 appels IA
    ingestion-pipeline.ts    -> orchestration W1
    email-drafts.ts          -> génération de brouillons via IA
    email-sender.ts          -> envoi réel (Nodemailer/Gmail)
    cv-parser.ts             -> extraction texte + fallback OCR + dédoublonnage
    s3.ts                    -> stockage/suppression CV
  app/
    login/, admin/users/     -> authentification et comptes
    jobs/, candidates/       -> coeur du produit
    drafts/                  -> validation des emails
    public/interviews/.../decline  -> page publique
    api/cron/                -> endpoints déclenchés par n8n
prisma/
  schema.prisma              -> modèle de données
  seed.ts                    -> jeu de données de démo
scripts/
  export-demo.ts             -> export JSON
```