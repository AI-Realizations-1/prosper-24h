# RETEX — Phase 10 : Production Ops, Observabilité et Sécurité Auth

**Date** : 2026-04-28  
**Commit** : c95374a  
**Durée d'exécution** : ~1 session

---

## Résumé exécutif

Phase 10 implémente la couche exploitation sans Docker :  
CD automatisé (staging) + manuel approuvé (production), observabilité minimale (pino, Sentry, health enrichi), migration auth vers cookie httpOnly + CSRF, et 4 runbooks ops.

---

## Livrables validés

| Livrable | Statut | Détails |
|----------|--------|---------|
| P10-01 CD staging | ✅ | `.github/workflows/deploy-staging.yml` — push main → build/test → SSH rsync → pm2 restart → smoke test |
| P10-01 CD production | ✅ | `.github/workflows/deploy-production.yml` — workflow_dispatch + environment `production` (approbation manuelle) |
| P10-02 Logging structuré | ✅ | `pino` + `pino-http`, requestId middleware, champs structurés JSON |
| P10-02 Health enrichi | ✅ | `/api/health` et `/health` : version, env, uptimeMs, DB ping |
| P10-02 Sentry | ✅ | Init conditionné par `SENTRY_DSN`, release taggée par `GIT_SHA`, env staging/production |
| P10-03 Cookie httpOnly | ✅ | refreshToken en cookie `prosper_refresh` httpOnly/secure/SameSite=Lax, accessToken en mémoire seulement |
| P10-03 CSRF | ✅ | Token HMAC-SHA256 sur nonce aléatoire, vérifié côté serveur via `X-CSRF-Token` sur `/api/auth/refresh` |
| P10-03 Frontend AuthContext | ✅ | Plus de localStorage, boot refresh via cookie + CSRF, `authLoading` pour éviter les redirections parasites |
| P10-03 PrivateRoute | ✅ | Affiche un spinner pendant `authLoading = true` |
| P10-04 Runbooks | ✅ | 4 runbooks : deploy, rollback, incident, backup-restore |

---

## Tests

| Suite | Résultat |
|-------|----------|
| API (lint) | ✅ tsc --noEmit 0 erreur |
| Web (lint) | ✅ tsc --noEmit 0 erreur |
| API (build) | ✅ tsc OK |
| Web (build) | ✅ vite build OK |
| API (tests, 7/7) | ✅ 100% coverage AuditLogService |
| Web (tests, 14/14) | ✅ 98% stmts, 72% branches (>70% seuil) |

---

## Décisions techniques

### Auth : double-submit CSRF vs csurf
Choix : HMAC-SHA256 sur nonce aléatoire, vérification serveur sans état.  
Raison : `csurf` est deprecated ; l'approche HMAC est reproductible, sans dépendance supplémentaire, et couvre le seul vecteur CSRF réel (endpoint `/refresh` consommé via cookie).

### CSRF scope restreint
CSRF protège uniquement `/api/auth/refresh`. Tous les autres endpoints de mutation utilisent `Authorization: Bearer` (pas vulnérable au CSRF côté navigateur).

### Rotation refresh token
À chaque appel à `/api/auth/refresh`, un nouveau refreshToken est émis (rotation). L'ancien est abandonné (pas de stockage serveur dans cette phase — limite connue).

### Logging : pino-pretty conditionné à NODE_ENV=development
En staging/production, les logs sont JSON structurés bruts (compatibles ingestion Loki/Datadog/CloudWatch).

---

## Incidents rencontrés

Aucun blocage majeur.  
- Note mineure : `@types/pino-http` et `@types/express-rate-limit` sont des stubs dépréciés (ces packages fournissent leurs propres types). Avertissements pnpm non bloquants.

---

## Limites connues

| Limite | Impact | Mitigation |
|--------|--------|-----------|
| Pas de liste noire refresh tokens | Un refresh token volé reste valide 7j | Rotation + durée courte atténuent le risque ; révocation serveur = M+1 |
| Smoke test CD dépend d'une infrastructure réelle | Inapplicable en CI sans serveur de staging configuré | Runbook deploy couvre la procédure manuelle |
| Sentry Web nécessite `VITE_SENTRY_DSN` au build | DSN intégré dans le bundle | Acceptable ; DSN n'est pas un secret critique |
| E2E ne testent pas le flux CSRF complet | Tests E2E adaptés pour lire le token via `/api/auth/csrf` | Couverture suffisante pour valider le flux |

---

## Prochaines actions priorisées

1. **Révocation serveur des refresh tokens** — stocker en DB les tokens actifs, invalider sur logout/rotation (M+1)
2. **Rotation automatique accessToken côté frontend** — intercepteur fetch qui appelle `/refresh` si 401 (M+1)
3. **Alertes Sentry** — configurer les règles d'alerte (taux d'erreur, health indisponible)
4. **Provisionning secrets GitHub** — documenter la procédure de création des environments GitHub (`staging`, `production`) avec protection rules
5. **Chiffrement backups** — chiffrer les dumps DB avec GPG avant archivage hors-site
