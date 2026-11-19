# ⚓ DockSlot

## Présentation

DockSlot est un prototype de plateforme web de **réservation de créneaux de carénage** pour navires industriels (ferries, porte-conteneurs…).

- **Armateur** : enregistre ses navires, cherche un créneau compatible dans un port, envoie une demande avec les services voulus, suit ou annule ses demandes.
- **Chantier naval** : reçoit les demandes sur ses docks, les accepte ou les refuse, publie ses créneaux et ses services.
- **Administrateur** : voit toutes les demandes, filtre par statut, consulte les compteurs.

Stack : Next.js 15 · Express 5 · Prisma 6 · PostgreSQL 16 · Zod · TypeScript strict · Tailwind CSS v4 · Vitest + Supertest.

## Démarrage rapide

Prérequis : **Node.js ≥ 20.12**, **Docker** (Docker Desktop démarré), un shell qui accepte `&&` (bash, zsh, Git Bash, cmd ou PowerShell 7 ; **pas** Windows PowerShell 5.1, où il faut lancer les commandes une par une).

```bash
cp apps/api/.env.example apps/api/.env && cp apps/web/.env.example apps/web/.env
docker compose up -d && npm install && npm run db:reset && npm run dev
```

- Web : http://localhost:3000
- API : http://localhost:4000/api/v1
- PostgreSQL est exposé sur le port **5433** de l'hôte (pour ne pas entrer en conflit avec un PostgreSQL local sur 5432).

Autres commandes :

| Commande | Rôle |
|---|---|
| `npm test` | Tests API (Vitest + Supertest) sur une base dédiée `dockslot_test`, créée automatiquement : parcours de réservation, invariants INV-1 à INV-9, authentification, configuration |
| `npm run e2e` | Rejoue le scénario complet via le proxy Next.js (`npm run dev` doit tourner ; faire `npm run db:seed` avant pour partir de l'état initial) |
| `npm run db:seed` | Remet les données de démo dans leur état initial |
| `npm run lint` · `npm run typecheck` · `npm run build` | Qualité et build des deux applications |

## Comptes de démo

Mot de passe commun : **`demo1234`** (boutons de connexion en un clic sur `/login`).

| Email | Rôle | Rattachement |
|---|---|---|
| `armateur@demo.fr` | Armateur | Méridien Ferries (Méridien Express, Méridien Cargo) |
| `chantier@demo.fr` | Chantier | Marseille Grand Carénage |
| `brest@demo.fr` | Chantier | Chantiers du Ponant (Brest) |
| `admin@demo.fr` | Administrateur | — |

## Scénario de démonstration

1. **Armateur** : se connecter avec `armateur@demo.fr`, ajouter un navire dans « Ma flotte » (formulaire « Ajouter un navire »).
2. **Recherche** : « Rechercher un créneau », choisir **Méridien Cargo** et **Marseille** → seule la Forme 10 apparaît (la Forme 8 est trop petite). Avec **Méridien Express**, les créneaux de la Forme 8 apparaissent aussi.
3. **Demande** : cocher deux services, ajouter une note, cliquer « Demander ce créneau » → retour sur « Mes demandes », statut **En attente**.
4. **Chantier** : se déconnecter, se connecter avec `chantier@demo.fr`, ouvrir « Demandes reçues », ajouter un commentaire et **Accepter**. Le créneau passe à « Réservé » et les autres demandes en attente sur ce créneau sont refusées automatiquement. Essayer aussi de publier un créneau qui chevauche un créneau existant → message d'erreur.
5. **Contrôle** : l'armateur voit **Acceptée** avec le commentaire du chantier ; `admin@demo.fr` voit les compteurs mis à jour et peut filtrer par statut. `brest@demo.fr` ne voit aucune demande de Marseille.

## Architecture

```
Navigateur ──► Next.js (:3000) ──/api/* (rewrite)──► Express (:4000) ──Prisma──► PostgreSQL (:5433)
               Server Components / Server Actions      routes → controllers → services → repositories
                     └──────── packages/shared : schémas Zod + types partagés ────────┘
```

```
apps/api        API Express (src/modules/<domaine>/{routes,controller,service,repository}.ts, prisma/, test/)
apps/web        Next.js App Router (src/app/(app)/{owner,shipyard,admin}, src/lib/api.ts = client typé)
packages/shared Schémas Zod, enums, DTO
scripts/        Scénario de démonstration de bout en bout
```

Détails et justification des choix : [ARCHITECTURE.md](ARCHITECTURE.md).

## Règles métier et comment elles sont garanties

| Règle | Garantie | Preuve |
|---|---|---|
| Le navire tient dans le dock (L, l, TE ≤ max) | Filtre SQL de la recherche + nouvelle vérification dans la transaction de création (422 `VESSEL_INCOMPATIBLE`) | `booking-flow.test.ts` (a), `invariants.test.ts` › INV-1 (cas limites au centimètre) |
| Un créneau = une seule demande acceptée | Transaction d'acceptation avec verrou `FOR UPDATE` + index unique partiel `bookings_one_accepted_per_slot` | `booking-flow.test.ts` (d), (e) et « niveau base » ; `invariants.test.ts` › INV-4 (atomicité) |
| Pas de chevauchement de créneaux sur un dock | Contrainte d'exclusion `slots_no_overlap` (GiST, `btree_gist`) + `CHECK (end_date > start_date)` → 409 `SLOT_OVERLAP` | `booking-flow.test.ts` (f) ; `invariants.test.ts` › INV-2 |
| Une seule demande active par navire et par créneau | Index unique partiel `bookings_one_active_per_vessel_slot` | `invariants.test.ts` › INV-5 |
| Cloisonnement des données | Chaque requête est filtrée par `companyId` / `shipyardId` issus du JWT, jamais du client ; `requireRole` sur chaque routeur | `booking-flow.test.ts` (c) ; `invariants.test.ts` › INV-6, INV-7 (matrice 401/403 de toutes les routes) |

Les règles ne sont jamais seulement dans le front : le front ne fait que de la validation de confort avec les mêmes schémas Zod.

## Choix et hypothèses

- **Dates de créneau** : jours calendaires (`DATE`), intervalle semi-ouvert `[début, fin)`. Un créneau peut commencer le jour où le précédent se termine ; durée = fin − début (en jours).
- **Recherche** : créneaux `OPEN` dont la date de début est comprise entre `from` et `to` (inclus), port comparé sans tenir compte de la casse.
- **Accès à la ressource d'un autre tenant** : 404 (on ne révèle pas son existence) ; mauvais rôle : 403.
- **Validation** : chaque contrôleur appelle le schéma Zod partagé ; une `ZodError` est transformée en 400 `VALIDATION_ERROR` (avec `details`) par le gestionnaire d'erreurs central. Ce choix garde un typage strict sans cast.
- **Services hors chantier** dans une demande → 400 `VALIDATION_ERROR`.
- **Création de demande** : verrou `FOR SHARE` sur le créneau, pour qu'une acceptation concurrente ne puisse pas le réserver pendant la création.
- **IMO** : 7 chiffres, unique sur la plateforme ; la clé de contrôle n'est pas vérifiée (les IMO de démo sont fictifs).
- **Annulation** : uniquement depuis `PENDING` (409 `ALREADY_DECIDED` sinon).
- **Migrations** : `db:migrate` utilise `prisma migrate deploy`. C'est la commande non interactive adaptée à un démarrage automatisé. `prisma migrate diff` entre la base et le schéma est vide : les contraintes en SQL brut (exclusion, index partiels) ne créent pas de dérive. Les nouvelles migrations se créent avec `prisma migrate dev --create-only` puis se relisent.
- **Versions** : Prisma 6 (la 8 n'est qu'en release candidate), Vitest 3.2 (npm 10 échoue à résoudre les dépendances de Vitest 4 dans ce monorepo), Next.js 15.5 comme demandé (le dépôt partait d'un squelette Next 16, remplacé).
- **Build de l'API** : vérification de types (`tsc --noEmit`) ; l'API s'exécute avec `tsx`, suffisant pour un prototype.
- **Rate limiting** : 20 échecs de connexion / 15 min / IP sur `POST /auth/login` (les connexions réussies et la vérification de session `/auth/me` ne sont pas comptées). Express fait confiance au proxy local (`trust proxy = loopback`).
- **Secret JWT** : en production, l'API refuse de démarrer si `JWT_SECRET` fait moins de 32 caractères ou reprend la valeur d'exemple.
- **Refresh token** : hors périmètre (`TODO` dans `apps/api/src/modules/auth/auth.token.ts`). Session de 8 h, puis retour sur `/login`.
- **Données de démo** fictives, dates calculées à partir du jour courant (11 créneaux sur 90 jours).

## Utilisation de l'IA

- L'architecture (ARCHITECTURE.md) a été cadrée en amont avec un assistant IA (comparaison d'options, format ADR).
- Le code a été produit avec **Claude Code** à partir d'un prompt structuré (rôle, stack imposée, modèle de données, contrat d'API, règles métier, phases avec point de contrôle et commit à chaque phase).
- Chaque phase a été vérifiée avant de passer à la suivante : requête SQL qui prouve l'erreur `23P01`, appels `curl` sur l'authentification, tests Vitest/Supertest des règles critiques (y compris la concurrence), scénario de bout en bout scripté, puis parcours complet dans un navigateur.
- Garde-fou observé : Prisma refuse d'exécuter `migrate reset` lorsqu'il détecte un agent IA, sans consentement explicite de l'utilisateur. La vérification a donc été faite avec `migrate deploy` + `db:seed` sur une base vierge.
- Points à relire en priorité par un humain : `apps/api/prisma/migrations/*_booking_integrity`, `apps/api/src/modules/bookings/bookings.service.ts` (transactions), `apps/api/src/lib/tenancy.ts` et `middlewares/auth.ts`.

## Limites et perspectives

Limites actuelles :
- Pas de refresh token ni de révocation de session ; pas de journal d'audit.
- Pas de notifications (e-mail ou dans l'application) lors des changements de statut.
- Pas de pagination ; pas de modification ou suppression de créneaux et de services ; pas de documentation OpenAPI.
- Pas de tests d'interface automatisés (le parcours UI a été vérifié manuellement) ; pas de CI.

Prochaines étapes les plus utiles :
1. **Sécurité des sessions** : jeton d'accès court + refresh token rotatif, révocation, journal d'audit des décisions.
2. **Notifications** à l'armateur et au chantier à chaque changement de statut (e-mail + centre de notifications).
3. **Industrialisation** : CI GitHub Actions (lint, types, tests, build), tests Playwright du parcours, OpenAPI générée depuis les schémas Zod, déploiement UE.
