# RETEX — Transmission des prompts inter-session (2026-04-27)

## Contexte
Les prompts de phase étaient stockés dans `/memories/session/` qui ne persiste pas entre sessions.
Lors de la reprise de session, les prompts étaient introuvables, provoquant des blocages d'agent.

## Incident
- Prompts manquants au moment de l'exécution: tous les fichiers `/memories/session/prompt-*.md`
- Cause: `/memories/session` est scoped à la session courante — non persistant entre relancements

## Solution mise en place

### Fichiers créés (10 fichiers)
| Fichier | Rôle |
|---------|------|
| `.github/prompts/phases/phase1-bootstrap.md` | Prompt Phase 1 (reconstruit depuis RETEX) |
| `.github/prompts/phases/phase2-atelier1.md` | Prompt Phase 2 (reconstruit depuis RETEX) |
| `.github/prompts/phases/phase3-atelier2.md` | Prompt Phase 3 (reconstruit depuis RETEX) |
| `.github/prompts/phases/phase4-atelier3.md` | Prompt Phase 4 (opérationnel, spécification complète) |
| `.github/prompts/README.md` | Index des phases + règles d'usage |
| `RETEX/prompts-used.yaml` | Journal de progression phases 1-4 |
| `.instructions.md` | Instructions persistantes pour les agents Prosper |
| `docs/RUNBOOKS/run-phase2.md` | Runbook Phase 2 |
| `docs/RUNBOOKS/run-phase3.md` | Runbook Phase 3 |
| `docs/RUNBOOKS/run-phase4.md` | Runbook Phase 4 |

### Vérifications réalisées
- 4 prompts de phase présents dans `.github/prompts/phases/`: ✅
- `prompts-used.yaml` cohérent avec commits réels: ✅
- `.instructions.md` avec patterns impératifs: ✅
- 3 runbooks opérationnels: ✅
- Build non impacté (fichiers docs uniquement): ✅

## Lecture des prompts hors mémoire session

```bash
# Trouver la prochaine phase
cat ~/projects/Prosper/RETEX/prompts-used.yaml | grep -A2 "status: ready"

# Lire le prompt
cat ~/projects/Prosper/.github/prompts/phases/phase4-atelier3.md
```

## Livraison
- Commit: `e78c030`
- Message: `chore: persist phase prompts and add inter-session transmission workflow`
- Push: `origin/main`

## Prochaine phase
- **Phase 4 — Atelier 3**
- Prompt: `~/projects/Prosper/.github/prompts/phases/phase4-atelier3.md`
- Source de vérité active: `.github/prompts/phases/`
