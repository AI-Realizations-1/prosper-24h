# Prosper — Snapshot T+20h36

Application complète d'analyse de risques EBIOS RM (méthode ANSSI) construite avec GitHub Copilot en mode quasi-autonome.

**Ce repo est un snapshot figé** — état du projet 20 heures et 36 minutes après le premier commit.
Aucune modification post-facto. Aucune retouche.

---

## Contexte

Le 27 avril 2026 à 12h38, un seul objectif a été posé à un agent IA :

> Construire une application complète d'analyse de risques EBIOS RM — les 5 ateliers de la méthode ANSSI — en mode quasi-autonome.

Pas de chef de projet. Pas de revue de code externe. Un agent, un objectif, une contrainte de temps.

Ce snapshot correspond au commit `56b86ca` du 28 avril 2026 à 09h14 — dernière modification avant le cap des 24h.

---

## Ce que contient ce snapshot

- **5 ateliers EBIOS RM** implémentés de bout en bout
- Authentification JWT + RBAC
- Backend Express / TypeScript + Prisma + PostgreSQL
- Frontend React 18 / Vite
- Export PDF, import JSON, journal d'audit
- Tests Playwright (E2E), couverture 70 %
- Runbooks de rollback et de production

**22 commits sur le 27 avril. 12 phases complétées en moins de 24 heures.**

---

## Ce qui s'est passé pendant le développement

Entre la phase 3 et la phase 4, les prompts de contexte de l'agent ont disparu — stockés en mémoire de session, non persistants entre redémarrages.

L'agent ne s'est pas arrêté. Il a reconstitué son propre contexte depuis les retex précédents. 10 fichiers de prompt recréés de façon quasi-autonome.

Ce comportement n'était pas planifié. C'était précisément ce qu'on cherchait à observer.

---

## Stack technique

| Composant | Technologie |
|---|---|
| Backend | Express 4 + TypeScript + Prisma 5 |
| Frontend | React 18 + Vite 5 + React Router |
| Base de données | PostgreSQL 16 |
| Auth | JWT (access + refresh tokens) + bcrypt |
| Tests | Playwright + Vitest |
| Monorepo | pnpm workspaces + Turborepo |

---

## Lancer le projet

```bash
cp apps/api/.env.example apps/api/.env
# Renseigner DATABASE_URL dans .env

pnpm install
pnpm db:migrate
pnpm dev
```

---

## Licence

MIT

---

*Ce projet fait partie d'une série d'articles LinkedIn sur l'IA en pratique.*
*Publié sous l'organisation GitHub Air_1.*

---

## Acknowledgment

These experiments were conducted on personal time, with personally funded tools.

Thanks to Sopra Steria for giving each of us the freedom to invest in AI exploration on our own terms.
That freedom made this possible.

