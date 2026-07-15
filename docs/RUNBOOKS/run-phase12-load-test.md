# Runbook Load Test K6 — Phase 12

> Version : Phase 12 | Dernière mise à jour : 2026-04-28  
> Propriétaire : équipe Prosper  
> ⚠️ K6 ne s'exécute que contre **staging**, jamais contre production.

---

## Déclenchement

1. GitHub → **Actions** → **Load Test (K6)**
2. Cliquer **Run workflow**
3. Renseigner :
   - `base_url` : `https://staging.prosper.example.com`
   - `scenario` : `auth` ou `studies`

### Secrets requis (dans l'environment `staging`)
| Secret | Description |
|---|---|
| `E2E_EMAIL` | Email d'un compte de test actif sur staging |
| `E2E_PASSWORD` | Mot de passe correspondant |
| `E2E_API_TOKEN` | Token Bearer valide (utilisé uniquement par le scénario `studies`) |

---

## Scénarios disponibles

### `auth.k6.js` — Cycle complet login/access/logout
- **VUs** : 10 utilisateurs virtuels simultanés
- **Durée** : 30 secondes
- **Flow** : `POST /login` → `GET /studies` → `POST /logout` + sleep 2s
- **Seuils SLO** : p95 < 500ms, taux erreurs < 1%

### `studies.k6.js` — Lecture liste des études sous charge
- **VUs** : 20 utilisateurs virtuels simultanés
- **Durée** : 60 secondes
- **Flow** : `GET /studies` (répété) + sleep 1s
- **Seuils SLO** : p95 < 500ms, p99 < 2000ms, taux erreurs < 1%

---

## Lecture des résultats K6

Après la fin du workflow, télécharger l'artifact `k6-results-<scenario>-<run_id>` (JSON).

### Métriques clés à vérifier

| Métrique K6 | Signification | SLO Prosper |
|---|---|---|
| `http_req_duration{p(95)}` | 95e percentile des temps de réponse | < 500 ms |
| `http_req_duration{p(99)}` | 99e percentile des temps de réponse | < 2 000 ms |
| `http_req_failed{rate}` | Proportion de requêtes ayant échoué (non-2xx/3xx) | < 1 % |
| `vus_max` | Pic d'utilisateurs virtuels atteint | — |
| `iterations` | Nombre total d'itérations du scénario | — |

### Commande d'extraction rapide
```bash
cat k6-results.json | jq '
  select(.type == "Point" and .metric == "http_req_duration") |
  .data.value
' | sort -n | awk 'BEGIN{n=0} {a[n++]=$1} END{print "p95:", a[int(n*0.95)], "ms"}'
```

---

## Interprétation et actions

### Feux de signalisation

| p95 constaté | Statut | Action |
|---|---|---|
| < 500 ms | 🟢 Vert | Aucune — SLO respecté |
| 500 ms – 1 000 ms | 🟡 Orange | Investiguer : logs pino, Sentry Performance |
| > 1 000 ms | 🔴 Rouge | Incident P2 — voir ci-dessous |

### Actions si seuils dépassés

1. **Consulter les logs structurés Pino** sur le serveur staging :
   ```bash
   journalctl -u prosper-api --since "30 min ago" --no-pager | grep '"responseTime"'
   ```

2. **Consulter Sentry Performance** → Transactions → filtrer sur la période du test

3. **Identifier les requêtes lentes** en Prisma :
   - Activer `log: ['query']` temporairement dans `PrismaClient`
   - Chercher les requêtes sans index ou avec N+1

4. **Vérifier les ressources serveur** pendant le test :
   ```bash
   ssh deploy@staging "top -b -n 3 | head -20"
   ```

5. Si la cause est une requête Prisma non optimisée : ajouter un index, utiliser `select` pour limiter les colonnes, ou paginer la liste des études.

---

## Ajouter un nouveau scénario

1. Créer `apps/load-test/scenarios/<nom>.k6.js` en suivant la structure existante
2. Ajouter l'option dans le `type: choice` du workflow `load-test.yml`
3. Documenter les seuils ici

---

*Voir aussi : [SLO.md](../SLO.md) | [run-phase11-oncall.md](run-phase11-oncall.md)*
