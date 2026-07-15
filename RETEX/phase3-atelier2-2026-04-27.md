# RETEX — Phase 3 Atelier 2 (2026-04-27)

## Contexte
Implémentation complète de l'Atelier 2 EBIOS RM dans Prosper, après la livraison de la Phase 2 (Atelier 1 + Auth + Prisma).

## Objectif
Livrer les fonctionnalités A2-01 à A2-04:
- Identifier les sources de risque
- Identifier les objectifs visés
- Construire les couples SR/OV
- Evaluer puis sélectionner les couples pertinents

## Réalisations
### Backend
- Prisma:
  - Ajout des modèles `RiskSource`, `TargetObjective`, `RiskSourceObjectivePair`
  - Ajout de l'enum `PairRelevance` (`PENDING`, `RETAINED`, `EXCLUDED`)
  - Ajout des relations inverses dans `Study`
  - Migration appliquée: `20260427125013_atelier2`
- Services:
  - `RiskSourceService`
  - `TargetObjectiveService`
  - `RiskSourceObjectivePairService`
- Controllers:
  - `RiskSourceController`
  - `TargetObjectiveController`
  - `RiskSourceObjectivePairController`
- Routes:
  - `/api/studies/:studyId/risk-sources`
  - `/api/studies/:studyId/target-objectives`
  - `/api/studies/:studyId/risk-source-objective-pairs`
  - + endpoints métier: `GET /retained`, `PATCH /:id/relevance`
- Intégration serveur:
  - Montage des 3 nouvelles routes dans `src/index.ts`

### Frontend
- Hooks:
  - `useRiskSources`
  - `useTargetObjectives`
  - `useRiskSourceObjectivePairs`
- Composants:
  - `A2Form` (3 onglets: Sources, Objectifs, Couples)
  - Actions de pertinence: Retenir / Exclure / En attente
- Navigation:
  - `AtlierLayout` mis à jour pour activer l'Atelier 2

## Validation
- Build API: OK (`pnpm --filter api build`)
- Build Web: OK (`pnpm --filter web build`)
- Migration Prisma: OK
- Issues GitHub fermées:
  - #20 A2-01
  - #21 A2-02
  - #22 A2-03
  - #23 A2-04

## Commit / Livraison
- Commit: `a0cee1f`
- Message: `feat: Phase 3 — Atelier 2 (sources de risque, objectifs visés, couples SR/OV)`
- Push: `origin/main`

## Points d'attention
- Le composant `A2Form` suit volontairement un style simple cohérent avec l'existant.
- La création de couple SR/OV utilise des sélecteurs DOM (`getElementById`) conformément au prompt d'atelier.

## Améliorations possibles (Phase suivante)
- Ajouter tests unitaires/intégration spécifiques Atelier 2 (backend + frontend)
- Remplacer `getElementById` par un état React contrôlé
- Ajouter pagination/filtrage sur les listes SR/OV si volumétrie élevée
