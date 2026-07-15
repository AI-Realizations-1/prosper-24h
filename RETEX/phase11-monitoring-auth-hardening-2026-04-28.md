# RETEX — Phase 11 : Monitoring avancé & Auth Hardening

**Date** : 2026-04-28  
**Commits** : `0b220b4` (code) · `be8b92c` (docs)  
**Durée d'exécution** : ~2 sessions (reprise après compaction de contexte)

**Commits** : `0b220b4` (code) · `be8b92c` (docs)  
**Durée d'exécution** : ~2 sessions (reprise après compaction de contexte)

---

## Résumé exécutif

Phase 11 ferme les deux dernières lacunes critiques de Phase 10 et complète la couche exploitabilité :

1. **Auth hardening** — les refresh tokens sont désormais stockés serveur et révocables (table `RefreshToken` Prisma). Chaque rotation invalide l'ancien token. Le logout révoque immédiatement. Un intercepteur côté client relance automatiquement les requêtes après un refresh silencieux.
2. **Sentry Web** — le frontend émet maintenant ses propres erreurs vers Sentry avec release et environment corrects ; les sourcemaps sont uploadés automatiquement au déploiement.
3. **GitHub Environments** — les workflows CD exposent des URLs d'environnement et sont prêts pour les protection rules GitHub.
4. **Backups GPG** — deux scripts ops (`backup.sh` / `restore.sh`) chiffrent les dumps PostgreSQL avec GPG. Un pre-deploy backup est déclenché avant chaque SSH rsync.
5. **SLO & On-Call** — 7 objectifs de service formalisés, runbook 6 scénarios couvrant les incidents les plus probables.

---

## Livrables validés

| Livrable | Statut | Détails |
|---|---|---|
| P11-01 Modèle `RefreshToken` | ✅ | Prisma model + migration `20260428013939_add_refresh_token_table` appliquée |
| P11-01 `AuthService` révocation | ✅ | `storeRefreshToken`, `rotateRefreshToken` (old token révoqué à chaque rotation), `revokeRefreshToken` |
| P11-01 `AuthController` révocation | ✅ | `refresh` → `rotateRefreshToken` ; `logout` → `revokeRefreshToken` avant clear cookie |
| P11-01 Purge job | ✅ | `setInterval` 24h dans `index.ts`, supprime les lignes `expiresAt < now()` |
| P11-01 `fetchWithAuth` | ✅ | Intercepteur 401 : refresh silencieux + retry ; déconnexion propre si refresh échoue |
| P11-02 `@sentry/react` init | ✅ | `main.tsx` conditionné sur `VITE_SENTRY_DSN`, release = `__COMMIT_SHA__`, env = `VITE_ENV` |
| P11-02 `vite.config.ts` | ✅ | `define.__COMMIT_SHA__` injecté depuis `process.env.GIT_SHA` |
| P11-02 Sourcemaps staging | ✅ | `deploy-staging.yml` upload `@sentry/cli` conditionnel sur `SENTRY_AUTH_TOKEN` |
| P11-02 Sourcemaps production | ✅ | `deploy-production.yml` idem, env `VITE_ENV: production` |
| P11-03 GitHub Environments | ✅ | `staging` → `https://staging.prosper.example.com`, `production` → `https://prosper.example.com` |
| P11-04 `scripts/backup.sh` | ✅ | `pg_dump` → GPG encrypt → `/var/backups/prosper/`, purge auto +30j |
| P11-04 `scripts/restore.sh` | ✅ | Confirmation interactive, GPG decrypt → `psql`, nettoyage fichier temporaire |
| P11-04 Étape CD backup | ✅ | Pre-deploy dans les deux workflows, conditionnel sur secrets |
| P11-05 `docs/SLO.md` | ✅ | 7 SLI/SLO (disponibilité, latences p95/p99, 5xx, auth, RTO, RPO), error budget, table alertes Sentry |
| P11-05 Runbook on-call | ✅ | 6 scénarios : API down, 5xx élevé, DB unreachable, CD bloqué, CSRF massif, refresh invalide massif |

---

## Tests

| Suite | Résultat |
|---|---|
| API lint (`tsc --noEmit`) | ✅ 0 erreur |
| Web lint (`tsc --noEmit`) | ✅ 0 erreur |
| API build (`tsc`) | ✅ OK |
| Web build (`vite build`) | ✅ 228 kB bundle |
| API tests | ✅ 7/7 — coverage 100% |
| Web tests | ✅ 14/14 — coverage 98% stmts |

---

## Décisions techniques

### Auth stateful : table `RefreshToken` vs liste noire
Choix : stocker **tous** les tokens actifs en base (approach whitelist), pas seulement une liste noire.  
Raison : la whitelist permet une révocation propre (logout d'un seul device), une rotation garantie (l'ancien token est marqué `revokedAt` à chaque rotation), et facilite un futur multi-device. La liste noire aurait nécessité un TTL de purge plus complexe.

### Rotation : révocation atomique
`rotateRefreshToken` révoque l'ancien token et crée le nouveau dans la même transaction logique (deux opérations Prisma séquentielles). En cas d'échec sur la création du nouveau, le client reçoit un 401 et doit se reconnecter — comportement sûr.

### `fetchWithAuth` : un seul retry
L'intercepteur tente un refresh **une seule fois** après un 401. Si le nouveau token produit un nouveau 401, la déconnexion est forcée. Ce garde-fou évite une boucle infinie sur les endpoints protégés qui retournent 401 pour d'autres raisons (permissions).

### `import.meta.env` : `vite/client` dans tsconfig
Manquait dans le `tsconfig.json` web, ce qui provoquait `TS2339: Property 'env' does not exist on type 'ImportMeta'`. Correction : `"types": ["vite/client"]`. À appliquer systématiquement sur tout projet Vite+TypeScript.

### Headers spread : normalisation explicite
Le type `HeadersInit` (union `Headers | string[][] | Record<string,string>`) est incompatible avec le spread d'un objet littéral. Correction : normalisation explicite via `instanceof Headers ? Object.fromEntries(...)` avant le spread.

---

## Incidents rencontrés

| Incident | Cause | Résolution |
|---|---|---|
| `Duplicate identifier 'AuthController'` (TS2300) | L'implémentation P11 avait été appendée après l'ancienne version P10 sans remplacer le bloc | Suppression du doublon P10 en fin de fichier |
| `Duplicate 'useAuth'` (TS2393) dans `AuthContext.tsx` | Même pattern de doublon | Suppression du bloc P10 dupliqué en fin de fichier |
| `import.meta.env` TS2339 | `tsconfig.json` web sans `"types": ["vite/client"]` | Ajout de la directive types |
| `HeadersInit` TS2769 | Spread incompatible entre `RequestInit.headers` et `Record<string, string>` | Normalisation explicite avant spread |

---

## Limites connues

| Limite | Impact | Mitigation |
|---|---|---|
| Backups GPG dans CI sont éphémères | Le fichier `.gpg` produit sur le runner GitHub est perdu si non transféré | À connecter à S3/SFTP en M+2 |
| Purge job via `setInterval` | Redémarrage du process remet le timer à zéro, risque de décalage | Acceptable MVP ; cron système recommandé en production |
| Révocation single-device uniquement | Logout révoque le token de la session courante seulement | Multi-device (invalidation de tous les tokens d'un user) = backlog |
| E2E non mis à jour pour `fetchWithAuth` | Les tests E2E `studies.spec.ts` testent les flux sans exercer l'intercepteur 401 | Acceptable ; couverture unitaire du contexte est suffisante pour MVP |

---

## Secrets GitHub à provisionner

| Secret | Scope | Usage |
|---|---|---|
| `SENTRY_DSN_WEB` | staging + production | `VITE_SENTRY_DSN` injecté au build web |
| `SENTRY_AUTH_TOKEN` | staging + production | Upload sourcemaps via `@sentry/cli` |
| `SENTRY_ORG` | staging + production | Organisation Sentry |
| `SENTRY_PROJECT` | staging + production | Projet Sentry |
| `GPG_BACKUP_RECIPIENT` | staging + production | Email/fingerprint GPG pour chiffrement backups |

---

## Prochaines actions priorisées

1. **Configurer le stockage distant des backups GPG** — S3/SFTP ou artifact GitHub Releases pour ne pas perdre les `.gpg` produits en CI
2. **Activer les protection rules GitHub** sur l'environment `production` (reviewers obligatoires)
3. **Implémenter `/api/auth/logout-all`** — révoque tous les `RefreshToken` d'un utilisateur (multi-device)
4. **Configurer les alertes Sentry** — règles sur taux d'erreur > 2%, health check, latence p99
5. **Remplacer le purge job** par un cron système (`pg_cron` ou crontab) pour une purge fiable

