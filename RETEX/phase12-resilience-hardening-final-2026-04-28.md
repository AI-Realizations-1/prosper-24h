# RETEX — Phase 12 : Résilience complète & hardening final

> Date : 2026-04-28  
> Commit : `d0fb2a6`  
> Branche : `main`  
> Durée estimée : 1 session

---

## Résumé exécutif

Phase 12 boucle le hardening de Prosper sur 5 livrables : backups GPG hors-site automatisés, révocation multi-device des sessions, purge cron des tokens expirés, load testing K6, et procédure de rollback opérationnel avec runbooks. L'ensemble des tests et builds passe sans erreur.

---

## Livrables implémentés

### P12-01 — Backups GPG hors-site
- `scripts/backup.sh` enrichi : transfert SFTP ou S3 après chiffrement GPG
- `scripts/verify-backup.sh` créé : téléchargement + déchiffrement + vérification taille
- Workflows `deploy-staging.yml` et `deploy-production.yml` mis à jour : step backup + step verify conditionnel
- Variables d'environnement requises documentées : `SFTP_HOST`, `SFTP_USER`, `SFTP_TARGET_PATH`, `BACKUP_S3_BUCKET`

### P12-02 — Auth multi-device
- `AuthService.revokeAllRefreshTokens(userId)` : révocation de toutes les sessions
- `AuthService.listActiveSessions(userId)` : liste des tokens non révoqués et non expirés
- Route `POST /api/auth/logout-all` : révocation + effacement cookie
- Route `GET /api/auth/sessions` : liste pour l'utilisateur courant
- Bouton "Déconnecter tous les appareils" sur `DashboardPage`
- 4 tests API (`AuthService.multidevice.test.ts`) + 1 test UI (`DashboardPage.test.tsx`)

### P12-03 — Purge cron des tokens expirés
- Bloc `setInterval` supprimé de `apps/api/src/index.ts` (anti-pattern en production)
- `scripts/purge-expired-tokens.sh` créé : suppression via CTE PostgreSQL, sortie horodatée
- Configuration crontab documentée dans le runbook maintenance

### P12-04 — Load testing K6
- `apps/load-test/scenarios/auth.k6.js` : 10 VUs, 30s, cycle complet login/access/logout
- `apps/load-test/scenarios/studies.k6.js` : 20 VUs, 60s, lecture liste études
- `.github/workflows/load-test.yml` : déclenchement manuel `workflow_dispatch`, archivage résultats 30j
- Seuils SLO : p95 < 500ms, p99 < 2000ms, taux erreurs < 1%

### P12-05 — Rollback opérationnel
- `scripts/rollback.sh` : `--tag <SHA>` obligatoire, confirmation interactive, git checkout + build + rsync + pm2 restart
- `docs/RUNBOOKS/run-phase12-maintenance.md` : purge tokens, verify backup, rotation JWT, rotation GPG
- `docs/RUNBOOKS/run-phase12-rollback.md` : critères, pré-requis, procédure A (script) et B (manuel), vérification post-rollback, communication
- `docs/RUNBOOKS/run-phase12-load-test.md` : déclenchement GitHub Actions, lecture métriques K6, feux de signalisation SLO, actions correctives

---

## Résultats des tests

| Suite | Tests | Statut |
|---|---|---|
| API (`@prosper/api test:coverage`) | 11/11 | ✅ |
| Web (`web test:coverage`) | 15/15 | ✅ |
| API TypeScript (`tsc --noEmit`) | — | ✅ |
| Web TypeScript (`tsc --noEmit`) | — | ✅ |

---

## Décisions techniques

### Purge tokens : CTE PostgreSQL plutôt que `SELECT ROW_COUNT()`
`ROW_COUNT()` est une syntaxe MySQL. Pour PostgreSQL, on utilise une CTE `WITH deleted AS (DELETE ... RETURNING id) SELECT COUNT(*) FROM deleted` qui retourne le nombre de lignes supprimées de façon portable et fiable.

### Transfert backup : variable `BACKUP_DESTINATION` (sftp | s3)
La même valeur permet de choisir la cible sans modifier le script. Default à `sftp` pour ne pas casser les environnements existants.

### Rollback : confirmation interactive maintenue
Le script rollback exige une confirmation `yes` avant d'agir pour éviter tout rollback accidentel via une mauvaise variable shell ou copier-coller.

### K6 uniquement staging
Le workflow `load-test.yml` est déclenché manuellement (`workflow_dispatch`) et ne peut pas être confondu avec un déploiement. Il n'est jamais lancé contre la production.

---

## Incidents / blocages rencontrés

Aucun blocage lors de cette phase. Toutes les opérations de création de fichiers et de modification ont réussi dès la première tentative.

---

## Limites connues

| Limite | Impact | Mitigation |
|---|---|---|
| Rollback sans serveur staging réel | Exercice non exécuté en conditions réelles | Procédure validée logiquement ; à tester lors du prochain provisionnement staging |
| K6 sans environnement cible disponible | Scénarios non exécutés contre un serveur réel | Tests déclenchables via GitHub Actions dès staging disponible |
| Backups SFTP sans serveur de backup configuré | `verify-backup.sh` retourne une erreur si `SFTP_HOST` absent | Step conditionnel dans les workflows CD (`if: secrets.SFTP_HOST != ''`) |

---

## Prochaines actions (post-Phase 12)

1. Provisionner un serveur staging et exécuter l'exercice de rollback en conditions réelles
2. Configurer `SFTP_HOST` dans GitHub Secrets et valider le cycle backup/verify en CI
3. Définir et planifier la Phase 13 si nécessaire (monitoring avancé, multi-tenant, etc.)
4. Revoir la couverture de branches Web (72,72%) — branches non couvertes dans `StudySummaryPanel.tsx` et `DashboardPage.tsx`
