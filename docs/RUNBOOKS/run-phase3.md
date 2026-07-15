# Runbook Phase 3 — Atelier 2 (Sources de risque)

## Pré-check
- Repo sur `main` (`git status`)
- Phase 2 marquée `completed` dans `RETEX/prompts-used.yaml`
- Build propre avant démarrage: `pnpm --filter api build`
- Tables Phase 2 en base (vérifier via `npx prisma studio` ou psql)

## Exécution
1. Ouvrir `.github/prompts/phases/phase3-atelier2.md`
2. Exécuter le prompt dans l'agent
3. Vérifier builds: `pnpm --filter api build && pnpm --filter web build`
4. Vérifier migration `atelier2` appliquée: `cd apps/api && npx prisma migrate status`
5. Issues #20-#23 fermées sur GitHub

## Post-check
- Mettre à jour `RETEX/prompts-used.yaml`: `status: ready → completed`
- Commit/push RETEX
