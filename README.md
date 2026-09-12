# ATS Responsable

Suivi de candidatures qui résume les CV avec l'IA et aide à préparer l'entretien —
**sans jamais décider à la place du recruteur.**

**Démo en ligne :** https://ats-responsable.vercel.app

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | `admin@example.com` | `admin123` |
| Recruteur | `recruteur@example.com` | `recruteur123` |

(l'écran de connexion propose aussi des boutons de remplissage automatique)

## Principes du projet

- Aucun score global, aucun rejet automatique. L'IA constate, elle ne juge jamais.
- Chaque information extraite est reliée à une citation exacte du CV source (traçabilité).
- Toute extraction erronée peut être corrigée manuellement par le recruteur.
- Aucun email ne part sans validation humaine explicite (page `/drafts`).
- Un candidat peut demander la suppression de ses données à tout moment, même en cours de process.
- Accès par rôle : la création de poste et la suppression RGPD sont réservées aux comptes **Admin**.

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
# renseigner les vraies valeurs dans .env (voir section Variables d'environnement)

npm run prisma:generate
npm run prisma:migrate
npm run seed

npm run dev
```

L'app est disponible sur http://localhost:3000 — redirige automatiquement vers `/login`.

## Variables d'environnement

Voir `.env.example` pour la liste complète. Points d'attention :

- **`DATABASE_URL`** : utiliser l'URL du **pooler** Supabase (`pooler.supabase.com:6543`), pas la connexion directe — nécessaire pour fonctionner correctement sur un environnement serverless (Vercel).
- **`AUTH_SECRET`** : chaîne aléatoire longue, sert à signer les sessions.
- **`CRON_SECRET`** : protège les endpoints `/api/cron/*` appelés par n8n, pour empêcher un déclenchement public non autorisé.
- **`GMAIL_USER` / `GMAIL_APP_PASSWORD`** : compte Gmail dédié (pas un compte personnel), avec un mot de passe d'application généré après activation de la validation en 2 étapes.

## Architecture des workflows

### W1 — Ingestion d'un CV
```
Upload -> Stockage privé (Supabase Storage) -> Dédoublonnage (hash nom+email)
       -> Extraction texte (unpdf, fallback OCR si nécessaire)
       -> 3 appels IA séparés : extraction factuelle / critères / questions
       -> Passage automatique "Reçu" -> "Présélection"
```
Exécuté **directement par l'application** (appel synchrone), plutôt que via n8n, pour garantir la fiabilité de la démo et éviter une dépendance réseau supplémentaire sur le chemin critique.

### W2 — Entretien
```
Planification (recruteur) -> Brouillon d'invitation généré par IA -> Validation humaine (/drafts)
Lien de refus inclus dans l'email -> page publique /public/interviews/[id]/decline (sans compte)
n8n (Schedule Trigger, /api/cron/rappels) -> détecte les entretiens proches -> brouillon de rappel J-1
Après l'entretien -> feedback saisi par le recruteur -> "Entretien fait"
Décision finale (texte libre, jamais un score) -> "Décidé"
```

### W3 — Relance
```
n8n (Schedule Trigger, /api/cron/relances) -> détecte les candidatures sans mise à jour depuis 5 jours
-> génère un brouillon de relance -> validation humaine avant envoi
```

**Pourquoi n8n orchestre le temporel mais pas la logique métier** : la logique IA reste versionnée et testable dans le code de l'application ; n8n se contente de déclencher ces endpoints à intervalle régulier via des appels HTTP protégés par `CRON_SECRET`. Ce découpage évite qu'un changement de logique métier nécessite de modifier un workflow n8n en plus du code.

### Suppression RGPD
```
Demande (Admin uniquement) -> suppression réelle du CV sur le stockage
-> suppression des extractions IA liées (données identifiantes)
-> anonymisation du candidat (la ligne reste, pour l'intégrité des logs d'audit)
-> confirmation envoyée immédiatement (exécution d'un droit, pas une décision produit,
   donc pas soumise à la même validation humaine que les autres emails)
```

## Cas limites gérés

| Cas | Comportement |
|---|---|
| CV sans texte exploitable | Fallback OCR ; si échec aussi, statut `FAILED` visible, saisie manuelle proposée |
| Candidat en doublon | Détection par hash nom+email ; jamais de fusion automatique, notification uniquement |
| Critère non présent | Affiché neutre (`NOT_FOUND`), jamais interprété négativement |
| Invitation refusée | Lien public de refus -> notification email au recruteur + brouillon de relance généré |
| Suppression pendant le process | Traitée à tout moment, quel que soit le stage de la candidature |

## Choix techniques notables

- **Authentification maison (jose + bcryptjs)** plutôt que NextAuth : librairies pures JS, compatibles Edge Runtime (middleware) sans compilation native — plus stable sur Windows en développement.
- **Pas d'auto-inscription publique** : un outil de recrutement interne n'a pas vocation à laisser n'importe qui créer un compte. Seul un Admin crée des comptes Recruteur (`/admin/users`).
- **Suppression RGPD par anonymisation plutôt que suppression physique** : préserve l'intégrité des journaux d'audit tout en rendant les données personnelles inaccessibles.
- **3 appels IA séparés** (extraction / matching / questions) plutôt qu'un seul prompt monolithique : chaque responsabilité est isolée, testable et débogable indépendamment.

## Limites connues

- La planification d'entretien enregistre une date/heure en base mais ne synchronise pas avec un calendrier externe (Google Calendar) — une vraie intégration nécessiterait OAuth2 et l'API Calendar, hors scope pour ce format d'exercice.
- L'envoi d'email passe par un compte Gmail standard (limite de 500 emails/jour), suffisant pour une démo mais à remplacer par un service transactionnel dédié (Resend, SES) en production réelle.
- Le lien de refus d'entretien utilise l'identifiant de l'entretien (peu prévisible mais non signé cryptographiquement) — une vraie mise en production ajouterait un token dédié à usage unique.
- Pas de notes privées/partagées ni de grille d'entretien structurée dans la fiche candidat — les questions suggérées par l'IA en tiennent lieu de façon minimale.
- Les tests automatisés ne sont pas inclus dans ce livrable, faute de temps sur le format 2 jours.

## Exports

```bash
npm run export:demo
```
Génère `exports/demo-dataset.json` (jeu de données) et `exports/workflows.json` (description structurée des workflows).

## Structure du projet

```
src/
  middleware.ts              -> protection des routes par session
  lib/
    auth.ts                  -> session (jose), mots de passe (bcryptjs)
    ai-extraction.ts         -> les 3 appels IA (extraction/matching/questions)
    ingestion-pipeline.ts    -> orchestration du pipeline W1
    email-drafts.ts          -> génération de brouillons via IA
    email-sender.ts          -> envoi réel (Nodemailer/Gmail)
    cv-parser.ts             -> extraction texte + fallback OCR + dédoublonnage
    s3.ts                    -> stockage/suppression CV (Supabase Storage)
  app/
    login/, admin/users/     -> authentification et gestion des comptes
    jobs/, candidates/       -> coeur du produit
    drafts/                  -> validation des emails
    public/interviews/.../decline  -> page publique (sans compte)
    api/cron/                -> endpoints déclenchés par n8n
prisma/
  schema.prisma              -> modèle de données complet
  seed.ts                    -> jeu de données de démo
scripts/
  export-demo.ts             -> export JSON (livrable)
```