# Prompt Agent — Phase 3 : Atelier 2 — Sources de risque

## Statut
✅ COMPLETED — commits `a0cee1f` + `8498bdc` — 2026-04-27

## Objectif
Implémenter Atelier 2 EBIOS RM : sources de risque, objectifs visés, couples SR/OV avec évaluation de pertinence.

## Issues fermées
- #20 A2-01 — Identifier les sources de risque (SR)
- #21 A2-02 — Identifier les objectifs visés (OV) par chaque SR
- #22 A2-03 — Évaluer la pertinence des couples SR/OV
- #23 A2-04 — Sélectionner les couples SR/OV retenus

## Périmètre Backend
### Prisma
- Modèles: `RiskSource`, `TargetObjective`, `RiskSourceObjectivePair`
- Enum: `PairRelevance` (PENDING, RETAINED, EXCLUDED)
- Migration: `20260427125013_atelier2`

### Services
- `RiskSourceService` — CRUD, validateStudyAccess
- `TargetObjectiveService` — CRUD, validateStudyAccess
- `RiskSourceObjectivePairService` — create, getAll, getRetained, updateRelevance, delete

### Routes
- `GET|POST /api/studies/:studyId/risk-sources`
- `PATCH|DELETE /api/studies/:studyId/risk-sources/:id`
- `GET|POST /api/studies/:studyId/target-objectives`
- `PATCH|DELETE /api/studies/:studyId/target-objectives/:id`
- `GET|POST /api/studies/:studyId/risk-source-objective-pairs`
- `GET /api/studies/:studyId/risk-source-objective-pairs/retained`
- `PATCH /api/studies/:studyId/risk-source-objective-pairs/:id/relevance`
- `DELETE /api/studies/:studyId/risk-source-objective-pairs/:id`

## Périmètre Frontend
- Hooks: `useRiskSources`, `useTargetObjectives`, `useRiskSourceObjectivePairs`
- Composant: `A2Form` (3 onglets: Sources / Objectifs / Couples SR/OV)
- `AtlierLayout`: Atelier 2 activé (`disabled={i > 2}`)

## Pattern contrôleur
Utiliser `req.userId!` (pas `req.user!.id`), middleware `authMiddleware` (pas `authenticate`).

## RETEX
`RETEX/phase3-atelier2-2026-04-27.md`
