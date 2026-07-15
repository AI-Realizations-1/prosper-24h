# RETEX — Phase 4 Atelier 3 (2026-04-27)

## Contexte
Implémentation complète de l'Atelier 3 EBIOS RM dans Prosper, après la livraison de la Phase 3 (Atelier 2).

## Objectif
Livrer les fonctionnalités A3-01 à A3-05:
- Cartographier l'écosystème (parties prenantes)
- Évaluer les dépendances et niveaux de menace
- Construire les scénarios stratégiques
- Évaluer la vraisemblance des scénarios
- Définir les mesures de sécurité

## Réalisations
### Backend
- Prisma:
  - Ajout des modèles `Stakeholder`, `StrategicScenario`, `StrategicScenarioStakeholder`
  - Ajout des relations inverses dans `Study`, `RiskSourceObjectivePair`, `FearEvent`
  - Migration appliquée: `20260427165013_atelier3`
- Services:
  - `StakeholderService` — CRUD + validateStudyAccess
  - `StrategicScenarioService` — create, getAll, updateLikelihood, addStakeholder, removeStakeholder, delete
- Controllers:
  - `StakeholderController`
  - `StrategicScenarioController` (6 méthodes)
- Routes:
  - `/api/studies/:studyId/stakeholders` (GET, POST, PATCH/:id, DELETE/:id)
  - `/api/studies/:studyId/strategic-scenarios` (GET, POST, PATCH/:id/likelihood, POST/:id/stakeholders, DELETE/:id/stakeholders/:stakeholderId, DELETE/:id)
- Intégration serveur:
  - Montage des 2 nouvelles routes dans `src/index.ts`

### Frontend
- Hooks:
  - `useStakeholders` — state + fetchAll + create + remove
  - `useStrategicScenarios` — state + fetchAll + create + updateLikelihood + remove
- Composant:
  - `A3Form` (3 onglets: Parties prenantes / Scénarios / Synthèse)
  - Gestion niveaux dépendance/menace (1-4)
  - Gestion vraisemblance scénarios (1-4) avec codage couleur
- Navigation:
  - `AtlierLayout` mis à jour pour activer l'Atelier 3 (`disabled={i > 3}`)

## Validation
- Build API: OK (`pnpm --filter api build`)
- Build Web: OK (`pnpm --filter web build`)
- Migration Prisma: OK
- Issues GitHub fermées:
  - #28 A3-01
  - #29 A3-02
  - #30 A3-03
  - #31 A3-04
  - #32 A3-05

## Commit / Livraison
- Commit: `42cd6e8`
- Message: `feat: Phase 4 — Atelier 3 (parties prenantes, scénarios stratégiques)`
- Push: `origin/main`

## Points d'attention
- Utilisation de couples SR/OV **retenus** uniquement pour créer les scénarios (filtre `relevance === RETAINED`)
- Vraisemblance scénarios indépendante de celle des couples SR/OV
- Parties prenantes associables multi-scénario via junction table `StrategicScenarioStakeholder`
- Renommage `ssError → creationError` dans A3Form pour éviter conflit de variable

## Améliorations possibles (Phase suivante)
- Tests unitaires/intégration spécifiques Atelier 3
- Ajout mesures de sécurité préliminaires (A3-05 non couvert pour Atelier 3, sera Phase 4+ ou Atelier 5)
- Affichage des statistiques par niveau (dépendance/menace/vraisemblance)
- Export/import scénarios
