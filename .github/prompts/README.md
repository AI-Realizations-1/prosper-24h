# Prompts de phase — Prosper

Source de vérité des prompts d'exécution inter-agent/inter-session.

## Ordre des phases

| Phase | Fichier | Statut |
|-------|---------|--------|
| 1 | `phases/phase1-bootstrap.md` | ✅ completed |
| 2 | `phases/phase2-atelier1.md` | ✅ completed |
| 3 | `phases/phase3-atelier2.md` | ✅ completed |
| 4 | `phases/phase4-atelier3.md` | ✅ completed |
| 5 | `phases/phase5-atelier4.md` | ✅ completed |
| 6 | `phases/phase6-atelier5.md` | ✅ completed |
| 7 | `phases/phase7-transverses.md` | ✅ completed |
| 8 | `phases/phase8-hardening.md` | ✅ completed |
| 9 | `phases/phase9-polish.md` | ✅ completed |
| 10 | `phases/phase10-production-ops.md` | ✅ completed |
| 11 | `phases/phase11-monitoring-auth-hardening.md` | ✅ completed |
| 12 | `phases/phase12-resilience-hardening-final.md` | ✅ completed |

## Règle d'usage

- Toujours exécuter le prompt depuis ce dossier, **pas** depuis `/memories/session`.
- En cas de doute sur la phase courante: consulter `RETEX/prompts-used.yaml`.
- Les RETEX sont dans `RETEX/` à la racine du repo.

## Trouver la prochaine phase à exécuter

```bash
cat RETEX/prompts-used.yaml | grep -A2 "status: ready"
```

## Secrets GitHub requis (Settings → Secrets → Actions)

| Secret | Valeur pour l'environnement CI |
|--------|-------------------------------|
| `DATABASE_URL` | `postgresql://prosper:prosper@localhost:5432/prosper` |
| `JWT_SECRET` | valeur aléatoire ≥ 32 caractères |
| `JWT_REFRESH_SECRET` | valeur aléatoire ≥ 32 caractères |
| `CORS_ORIGIN` | `http://localhost:5173` |
| `E2E_EMAIL` | email du compte de test E2E (créer manuellement) |
| `E2E_PASSWORD` | mot de passe du compte de test E2E |
