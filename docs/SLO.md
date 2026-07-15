# SLO — Prosper

> Document de référence des objectifs de niveau de service (Service Level Objectives) de la plateforme Prosper.  
> Révisé après chaque incident significatif. Propriétaire : équipe Prosper.

---

## Indicateurs de service (SLI → SLO)

| Indicateur | Définition | Objectif | Outil de mesure |
|---|---|---|---|
| Disponibilité | Ratio requêtes `/api/health` success sur 30j | ≥ 99,5 % / mois | Sentry Uptime / Cron Monitor |
| Latence p95 API | 95e percentile des temps de réponse API | < 500 ms | Sentry Performance |
| Latence p99 API | 99e percentile des temps de réponse API | < 2 000 ms | Sentry Performance |
| Taux erreurs 5xx | Ratio réponses 5xx / total requêtes | < 1 % | Sentry Issues |
| Taux erreurs auth | Ratio 401/403 sur `/api/auth/*` | < 2 % | Sentry Issues |
| RTO (reprise activité) | Délai max entre incident détecté et service rétabli | ≤ 30 min | Runbook deploy/rollback |
| RPO (perte de données max) | Données perdues max en cas de crash | ≤ 24 h | Backup quotidien GPG |

---

## Fenêtres d'erreur (Error Budget)

Pour 30 jours calendaires :

| SLO | Budget autorisé (30j) |
|---|---|
| Disponibilité 99,5 % | ≤ 3 h 36 min d'indisponibilité |
| Erreurs 5xx < 1 % | ≤ 1 % des requêtes en erreur |

Quand le budget est consommé à 80 %, une révision de priorité est déclenchée.

---

## Alertes associées (Sentry)

| Alerte | Seuil | Sévérité |
|---|---|---|
| Taux erreurs 5xx | > 2 % sur 5 min | P1 — Critical |
| Latence p99 | > 3 s sur 5 min | P2 — High |
| Uptime `/api/health` | Échec 2 checks consécutifs | P1 — Critical |
| Erreurs 4xx auth | > 5 % sur 10 min | P2 — High |

---

## Exclusions

Les pannes planifiées (maintenance annoncée ≥ 24h à l'avance) ne sont pas comptabilisées dans le SLO de disponibilité.

---

## Révision

- Fréquence : mensuelle ou après tout incident P1.
- Responsable révision : tech lead Prosper.
