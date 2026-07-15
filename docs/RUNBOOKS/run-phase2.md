# Runbook Phase 2 — Atelier 1 + Auth + Prisma

## Pré-check
- Repo sur `main` (`git status`)
- Phase 1 marquée `completed` dans `RETEX/prompts-used.yaml`
- PostgreSQL actif: `pg_isready -h localhost -U postgres`
- Dépendances installées: `pnpm install`

## Exécution
1. Ouvrir `.github/prompts/phases/phase2-atelier1.md`
2. Exécuter le prompt dans l'agent
3. Vérifier builds: `pnpm --filter api build && pnpm --filter web build`
4. Vérifier migration Prisma appliquée: `cd apps/api && npx prisma migrate status`

## Post-check
- Mettre à jour `RETEX/prompts-used.yaml`: `status: ready → completed`
- Commit/push RETEX
