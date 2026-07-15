# Runbook On-Call — Phase 11 (Monitoring avancé & Auth hardening)

> Version : Phase 11 | Dernière mise à jour : 2026-04-28  
> Responsable : équipe Prosper | Canal incident : #prosper-incidents

---

## Principes généraux

1. **Mesurer avant d'agir** — ne pas redémarrer à l'aveugle.
2. **Documenter en temps réel** — noter les actions dans le fil incident.
3. **Rollback si doute** — un rollback rapide vaut mieux qu'un diagnostic de 30 min en production.
4. **Post-mortem systématique** pour tout incident P1/P2**.

---

## Scénario 1 — API down (health check échoue)

**Signal Sentry** : alerte Uptime sur `/api/health`, 2 échecs consécutifs.

### Diagnostic rapide
```bash
curl -s https://prosper.example.com/api/health | jq .
```

| Résultat | Action |
|---|---|
| Timeout / connection refused | → Étape 2 : vérifier processus API |
| `{ "status": "error", "db": "error" }` | → Scénario 3 : DB unreachable |
| `{ "ok": true, "db": "ok" }` | Faux positif — vérifier proxy/LB |

### Vérifier le processus API
```bash
ssh deploy@prosper.example.com
ps aux | grep node
journalctl -u prosper-api --since "10 min ago" --no-pager
```

### Redémarrer si le processus est mort
```bash
systemctl restart prosper-api
sleep 5
curl -s https://prosper.example.com/api/health | jq .
```

### Rollback si instable
```bash
cd /var/www/prosper
ls -t releases/ | head -5
# Pointer current sur la release précédente
ln -sfn releases/previous_YYYYMMDDHHMMSS current
systemctl restart prosper-api
```

---

## Scénario 2 — Taux d'erreurs 5xx élevé

**Signal Sentry** : alerte `Taux erreurs 5xx > 2 %` sur 5 min.

### Identifier les erreurs
1. Ouvrir Sentry → Issues → filtrer `level:error` + `tag:environment:production`.
2. Repérer la stacktrace dominante.
3. Vérifier si le pattern est lié à un déploiement récent (horodatage).

### Actions par type d'erreur
| Pattern | Action |
|---|---|
| `Prisma / DB connection` | → Scénario 3 |
| `JWT / token` | → Scénario 6 |
| `Cannot read properties of undefined` | Bug applicatif → rollback si récent |
| `ENOMEM / ENOFILE` | Ressources serveur → voir logs système |

### Rollback si lié à un déploiement récent (< 2h)
Voir runbook [run-phase10-rollback.md](run-phase10-rollback.md).

---

## Scénario 3 — Base de données unreachable

**Signal** : `/api/health` retourne `{ "db": "error" }` ou logs Prisma `Can't reach database server`.

### Diagnostic
```bash
# Depuis le serveur applicatif
psql "$DATABASE_URL" -c "SELECT 1;"

# Vérifier le service PostgreSQL
systemctl status postgresql
journalctl -u postgresql --since "15 min ago" --no-pager
```

### Redémarrer PostgreSQL
```bash
systemctl restart postgresql
sleep 10
systemctl status postgresql
```

### Tester la connexion applicative
```bash
curl -s https://prosper.example.com/api/health | jq .
```

### Restauration depuis backup si corruption
```bash
# Choisir le dernier backup GPG sain
ls -lt /var/backups/prosper/

# Arrêter l'API
systemctl stop prosper-api

# Restaurer
DATABASE_URL="..." ./scripts/restore.sh /var/backups/prosper/prosper_YYYYMMDDHHMMSS.sql.gpg

# Redémarrer
systemctl start prosper-api
curl -s https://prosper.example.com/api/health | jq .
```

---

## Scénario 4 — Déploiement bloqué (CI/CD en échec)

**Signal** : GitHub Actions workflow `Deploy — Production` en état failed/pending.

### Vérifier l'étape en échec
1. GitHub → Actions → onglet du workflow en échec.
2. Identifier l'étape rouge : `validate`, `backup`, `deploy`.

### Par étape en échec
| Étape | Action |
|---|---|
| `validate` (lint/test/build) | Corriger le code, ne pas forcer le deploy |
| `Backup DB pre-deploy` | Vérifier secrets `DATABASE_URL` / `GPG_BACKUP_RECIPIENT` |
| `Upload Sentry sourcemaps` | Vérifier secrets `SENTRY_AUTH_TOKEN` — étape non bloquante |
| `Rsync` / `SSH` | Vérifier `DEPLOY_SSH_KEY` / `DEPLOY_SSH_HOST` / connectivité |
| `Migrate DB` | Vérifier log Prisma — risque de migration destructive → analyser |

### Déclenchement manuel d'un déploiement
```
GitHub → Actions → Deploy — Production → Run workflow → saisir SHA
```

---

## Scénario 5 — CSRF rejeté massivement

**Signal** : montée soudaine de réponses `403 Forbidden` sur `/api/auth/refresh` ou autres routes mutantes.

### Vérifier la cause
```bash
# Logs API récents
journalctl -u prosper-api --since "10 min ago" --no-pager | grep "csrf\|403"
```

### Causes fréquentes
| Cause | Action |
|---|---|
| `CSRF_SECRET` manquant ou changé en prod | Vérifier variable d'env, redémarrer |
| Reverse proxy qui supprime les headers custom | Vérifier config nginx : `proxy_pass_header X-CSRF-Token` |
| Client ne lit pas le token CSRF avant de poster | Bug frontend → vérifier `AuthContext.fetchWithAuth` |
| Cookie `SameSite` bloqué par navigateur | Vérifier config `SameSite=Lax` + HTTPS actif |

### Vérification manuelle
```bash
# Récupérer un token CSRF
TOKEN=$(curl -s https://prosper.example.com/api/auth/csrf | jq -r .csrfToken)
echo "Token: $TOKEN"

# Tenter un refresh avec le token
curl -s -X POST https://prosper.example.com/api/auth/refresh \
  -H "X-CSRF-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  --cookie "prosper_refresh=<token_test>" | jq .
```

---

## Scénario 6 — Refresh tokens invalides massivement

**Signal** : montée de réponses `401` sur `/api/auth/refresh`, déconnexions utilisateurs en masse.

### Diagnostic
```bash
# Compter les lignes refresh_tokens récentes
psql "$DATABASE_URL" -c "
  SELECT
    COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) AS revoked,
    COUNT(*) FILTER (WHERE expires_at < NOW()) AS expired,
    COUNT(*) FILTER (WHERE revoked_at IS NULL AND expires_at > NOW()) AS valid
  FROM refresh_tokens;
"
```

### Causes fréquentes
| Cause | Action |
|---|---|
| `JWT_REFRESH_SECRET` changé en prod | Tous les tokens existants deviennent invalides → prévoir re-login utilisateurs |
| Purge accidentelle de la table | Restaurer depuis backup (voir Scénario 3) |
| Réplication DB en retard | Vérifier lag réplication |
| Rotation token mal implémentée côté client | Vérifier `fetchWithAuth` dans `AuthContext.tsx` |

### Renouvellement d'urgence du secret (procédure planifiée)
1. Annoncer la fenêtre de maintenance (déconnexions inévitables).
2. Mettre à jour `JWT_REFRESH_SECRET` dans les secrets GitHub + env serveur.
3. Vider la table `refresh_tokens` :
   ```sql
   TRUNCATE refresh_tokens;
   ```
4. Redémarrer l'API.
5. Communiquer aux utilisateurs de se reconnecter.

---

## Escalade

| Sévérité | Délai d'escalade | Contact |
|---|---|---|
| P1 (API down, perte de données) | Immédiat | Tech lead + DPO si données |
| P2 (dégradation fonctionnelle) | 15 min si non résolu | Tech lead |
| P3 (lenteur, erreur isolée) | Ticket GitHub, traitement J+1 | Équipe |

---

## Post-mortem

Pour tout incident P1 ou P2, créer un fichier `docs/POSTMORTEMS/incident-YYYY-MM-DD-<slug>.md` avec :
- Timeline des événements
- Cause racine identifiée
- Impact utilisateurs
- Actions correctives et préventives
- Délai de mise en œuvre

---

*Voir aussi : [SLO.md](../SLO.md) | [run-phase10-deploy.md](run-phase10-deploy.md) | [run-phase10-rollback.md](run-phase10-rollback.md)*
