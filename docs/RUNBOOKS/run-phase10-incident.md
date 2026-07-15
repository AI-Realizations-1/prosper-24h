# Runbook — Gestion d'incident Prosper

## Niveaux de sévérité

| Niveau | Description | Temps de réponse |
|--------|-------------|-----------------|
| P1 — Critique | Service totalement indisponible ou perte de données | < 15 min |
| P2 — Élevé | Fonctionnalité critique dégradée | < 1h |
| P3 — Modéré | Fonctionnalité secondaire impactée | < 4h |
| P4 — Faible | Bug cosmétique ou intermittent | Prochain sprint |

## Diagnostic initial

### 1. Vérifier l'état du service

```bash
# Health API
curl -sf http://<host>:3001/api/health | jq .

# Processus pm2
ssh <user>@<host> "pm2 list"

# Logs récents (50 dernières lignes structurées)
ssh <user>@<host> "pm2 logs prosper-api --lines 50 --nocolor"

# Utilisation ressources
ssh <user>@<host> "free -h && df -h && uptime"
```

### 2. Vérifier la base de données

```bash
ssh <user>@<host>
cd <target>/api
source .env.production

# Test de connexion
psql "$DATABASE_URL" -c "SELECT version();"

# Connexions actives
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity;"
```

### 3. Chercher dans Sentry

- Aller sur le projet Sentry `prosper-api` ou `prosper-web`
- Filtrer par `environment = staging` ou `environment = production`
- Identifier les issues ouvertes dans les dernières 15 minutes

## Procédure de résolution par type d'incident

### API ne répond plus (pm2 crashed)

```bash
ssh <user>@<host>
pm2 describe prosper-api
pm2 restart prosper-api
# Vérifier
curl -sf http://localhost:3001/api/health
```

### Erreurs 500 massives (régression de code)

1. Identifier le commit responsable via Sentry (champ `release`)
2. Déclencher un rollback → voir `run-phase10-rollback.md`

### Base de données inaccessible

```bash
# Vérifier le service PostgreSQL
ssh <user>@<host> "systemctl status postgresql"
ssh <user>@<host> "systemctl restart postgresql"

# Vérifier les connexions
psql "$DATABASE_URL" -c "SELECT 1;"
```

### Erreurs d'authentification massives (401/403)

```bash
# Vérifier les variables JWT
ssh <user>@<host> "pm2 env prosper-api | grep JWT"

# Vérifier la validité du secret (doit être non vide)
# Si les secrets ont été rotationnés, mettre à jour et redémarrer
pm2 restart prosper-api --update-env
```

### Déploiement échoué en CI

1. Consulter les logs GitHub Actions → onglet "Deploy to Staging/Production"
2. Identifier l'étape en erreur
3. Si erreur SSH : vérifier le secret `DEPLOY_SSH_KEY`
4. Si erreur migration : vérifier `DATABASE_URL` et l'état de la DB
5. Si erreur pm2 : se connecter manuellement et vérifier l'installation pm2

## Communication incident

### Notification interne (Slack / email)

```
🔴 INCIDENT P{niveau} — {date/heure UTC}
Service : Prosper API / Web
Symptôme : <description courte>
Impact : <utilisateurs affectés>
Responsable : <nom>
Statut : Investigation en cours
```

### Clôture d'incident

```
✅ RÉSOLUTION — {date/heure UTC}
Durée : <X> minutes
Cause : <root cause>
Actions correctives : <description>
Prochaines actions préventives : <description>
```

## Post-mortem

Pour tout incident P1 ou P2, un post-mortem doit être rédigé dans `docs/incidents/YYYY-MM-DD-<slug>.md` dans les 48h suivant la résolution.

Structure recommandée :
- Résumé exécutif
- Timeline des événements
- Cause racine
- Impact mesuré
- Actions correctives appliquées
- Actions préventives planifiées
