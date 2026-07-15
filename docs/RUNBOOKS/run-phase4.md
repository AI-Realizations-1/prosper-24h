# Runbook Phase 4 — Atelier 3 (Scénarios stratégiques)

## Pré-check
- Repo sur `main` (`git status`)
- Phase 3 marquée `completed` dans `RETEX/prompts-used.yaml`
- Couples SR/OV avec `PairRelevance.RETAINED` présents en base
- FearEvents présents en base (depuis Phase 2)
- Build propre avant démarrage: `pnpm --filter api build`

## Exécution
1. Ouvrir `.github/prompts/phases/phase4-atelier3.md`
2. Exécuter le prompt dans l'agent (étapes 1 à 13)
3. Vérifier builds: `pnpm --filter api build && pnpm --filter web build`
4. Vérifier migration `atelier3` appliquée: `cd apps/api && npx prisma migrate status`
5. Issues #28-#32 fermées sur GitHub

## Post-check
- Mettre à jour `RETEX/prompts-used.yaml`: `status: ready → completed`, ajouter le commit
- Commit/push RETEX

## Commande rapide
```bash
cd ~/projects/Prosper
cat .github/prompts/phases/phase4-atelier3.md
```
