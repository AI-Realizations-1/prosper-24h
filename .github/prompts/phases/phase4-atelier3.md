# Prompt Agent — Phase 4 : Atelier 3 — Scénarios stratégiques

## Statut
⏳ READY — à exécuter après Phase 3

## Objectif
Implémenter Atelier 3 EBIOS RM : cartographie de l'écosystème (parties prenantes), évaluation des niveaux de dépendance et de menace, construction et évaluation des scénarios stratégiques.

## Issues à fermer
- #28 A3-01 — Cartographier l'écosystème (parties prenantes)
- #29 A3-02 — Évaluer les dépendances et niveaux de menace
- #30 A3-03 — Construire les scénarios stratégiques
- #31 A3-04 — Évaluer la vraisemblance des scénarios
- #32 A3-05 — Définir les mesures de sécurité préliminaires

## Pré-requis
- Phase 3 complétée (couples SR/OV en base avec `PairRelevance.RETAINED`)
- Événements redoutés (`FearEvent`) en base depuis Phase 2
- Build propre: `pnpm --filter api build && pnpm --filter web build`

---

## ÉTAPE 1 — Prisma Schema

Ajouter dans `apps/api/prisma/schema.prisma` après les modèles Atelier 2:

```prisma
model Stakeholder {
  id              String   @id @default(cuid())
  studyId         String
  name            String
  category        String
  dependencyLevel Int      // 1-4
  threatLevel     Int      // 1-4
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  study                Study                @relation(fields: [studyId], references: [id], onDelete: Cascade)
  strategicScenarios   StrategicScenarioStakeholder[]

  @@index([studyId])
  @@map("stakeholders")
}

model StrategicScenario {
  id          String   @id @default(cuid())
  studyId     String
  pairId      String
  fearEventId String
  likelihood  Int      // 1-4
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  study        Study                          @relation(fields: [studyId], references: [id], onDelete: Cascade)
  pair         RiskSourceObjectivePair        @relation(fields: [pairId], references: [id], onDelete: Cascade)
  fearEvent    FearEvent                      @relation(fields: [fearEventId], references: [id], onDelete: Cascade)
  stakeholders StrategicScenarioStakeholder[]

  @@index([studyId])
  @@map("strategic_scenarios")
}

model StrategicScenarioStakeholder {
  scenarioId    String
  stakeholderId String

  scenario    StrategicScenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  stakeholder Stakeholder       @relation(fields: [stakeholderId], references: [id], onDelete: Cascade)

  @@id([scenarioId, stakeholderId])
  @@map("strategic_scenario_stakeholders")
}
```

Ajouter les relations inverses dans Study:
```prisma
stakeholders        Stakeholder[]
strategicScenarios  StrategicScenario[]
```

Ajouter la relation inverse dans `RiskSourceObjectivePair`:
```prisma
strategicScenarios StrategicScenario[]
```

Ajouter la relation inverse dans `FearEvent`:
```prisma
strategicScenarios StrategicScenario[]
```

## ÉTAPE 2 — Migration Prisma

```bash
cd apps/api && npx prisma migrate dev --name atelier3
```

## ÉTAPE 3 — Services Backend

### `apps/api/src/services/StakeholderService.ts`
- Zod schema: `{ name: z.string().min(1), category: z.string().min(1), dependencyLevel: z.number().int().min(1).max(4), threatLevel: z.number().int().min(1).max(4) }`
- Méthodes: `create(studyId, data, userId)`, `getAll(studyId, userId)`, `update(id, data, userId)`, `delete(id, userId)`
- `validateStudyAccess` identique aux autres services

### `apps/api/src/services/StrategicScenarioService.ts`
- Zod schema: `{ pairId: z.string().min(1), fearEventId: z.string().min(1), likelihood: z.number().int().min(1).max(4), stakeholderIds: z.array(z.string()).optional() }`
- Méthodes:
  - `create(studyId, data, userId)` — inclure `stakeholders` dans include
  - `getAll(studyId, userId)` — inclure `pair.riskSource`, `pair.targetObjective`, `fearEvent`, `stakeholders.stakeholder`
  - `updateLikelihood(id, likelihood, userId)`
  - `addStakeholder(scenarioId, stakeholderId, userId)`
  - `removeStakeholder(scenarioId, stakeholderId, userId)`
  - `delete(id, userId)`

## ÉTAPE 4 — Controllers

### `apps/api/src/controllers/StakeholderController.ts`
Méthodes: `create`, `getAll`, `update`, `delete`
Utiliser `req.userId!` et `req.params.studyId`

### `apps/api/src/controllers/StrategicScenarioController.ts`
Méthodes: `create`, `getAll`, `updateLikelihood`, `addStakeholder`, `removeStakeholder`, `delete`

## ÉTAPE 5 — Routes

### `apps/api/src/routes/stakeholders.ts`
```typescript
router.get('/', authMiddleware, StakeholderController.getAll);
router.post('/', authMiddleware, StakeholderController.create);
router.patch('/:id', authMiddleware, StakeholderController.update);
router.delete('/:id', authMiddleware, StakeholderController.delete);
```

### `apps/api/src/routes/strategicScenarios.ts`
```typescript
router.get('/', authMiddleware, StrategicScenarioController.getAll);
router.post('/', authMiddleware, StrategicScenarioController.create);
router.patch('/:id/likelihood', authMiddleware, StrategicScenarioController.updateLikelihood);
router.post('/:id/stakeholders', authMiddleware, StrategicScenarioController.addStakeholder);
router.delete('/:id/stakeholders/:stakeholderId', authMiddleware, StrategicScenarioController.removeStakeholder);
router.delete('/:id', authMiddleware, StrategicScenarioController.delete);
```

## ÉTAPE 6 — Mettre à jour `apps/api/src/index.ts`

```typescript
import stakeholdersRoutes from './routes/stakeholders';
import strategicScenariosRoutes from './routes/strategicScenarios';

app.use('/api/studies/:studyId/stakeholders', stakeholdersRoutes);
app.use('/api/studies/:studyId/strategic-scenarios', strategicScenariosRoutes);
```

## ÉTAPE 7 — Hooks Frontend

### `apps/web/src/hooks/useStakeholders.ts`
Pattern: `state + fetchAll (useCallback) + create + remove`
Endpoint: `/api/studies/${studyId}/stakeholders`

### `apps/web/src/hooks/useStrategicScenarios.ts`
Pattern: `state + fetchAll + create + updateLikelihood(id, likelihood) + remove`
Endpoint: `/api/studies/${studyId}/strategic-scenarios`

## ÉTAPE 8 — Composant A3Form

`apps/web/src/components/A3Form.tsx`

3 onglets:
1. **Parties prenantes** — CRUD avec champs: nom, catégorie, niveau dépendance (1-4), niveau menace (1-4)
2. **Scénarios stratégiques** — Créer depuis couple SR/OV retenu + événement redouté + vraisemblance + stakeholders associés
3. **Vue synthèse** — Tableau des scénarios avec vraisemblance colorée (1=vert, 2=jaune, 3=orange, 4=rouge)

## ÉTAPE 9 — Mettre à jour AtlierLayout

- Importer `A3Form`
- Changer `disabled={i > 2}` en `disabled={i > 3}`
- Ajouter `{activeAtlier === 3 && <A3Form studyId={studyId} />}`

## ÉTAPE 10 — Build validation

```bash
pnpm --filter api build   # doit passer sans erreur
pnpm --filter web build   # doit passer sans erreur
```

## ÉTAPE 11 — Fermer les issues GitHub

```bash
for i in 28 29 30 31 32; do
  gh issue close $i --comment "Implémenté dans Phase 4 — Atelier 3. Build OK."
done
```

## ÉTAPE 12 — Commit et push

```bash
git add .
git commit -m "feat: Phase 4 — Atelier 3 (parties prenantes, scénarios stratégiques)"
git push origin main
```

## ÉTAPE 13 — RETEX

Créer `RETEX/phase4-atelier3-2026-04-27.md` avec:
- Réalisations backend/frontend
- Validation builds
- Issues fermées
- Numéro de commit

## Patterns à respecter (impératifs)
- Middleware: `authMiddleware` (import depuis `../middleware/auth`)
- Accès user: `req.userId!`
- Accès studyId: `req.params.studyId`
- Token frontend: `localStorage.getItem('accessToken')`
- Services: pattern `validateStudyAccess` en private static
- Routes: `Router({ mergeParams: true })`
