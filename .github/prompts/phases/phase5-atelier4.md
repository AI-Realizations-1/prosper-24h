# Prompt Agent — Phase 5 : Atelier 4 (Scénarios opérationnels)

## Contexte et prérequis
- Répertoire : ~/projects/Prosper/
- **Phase 4 complétée** : Atelier 3 (Stakeholder, StrategicScenario, StrategicScenarioStakeholder) fonctionnel
- Commit de référence : `42cd6e8` (feat: Phase 4 — Atelier 3)
- Issues GitHub à fermer : A4-01, A4-02, A4-03, A4-04 (labels atelier-4, P1)
- Pattern établi : Service (Prisma + Zod) → Controller (parse + try/catch) → Route (authMiddleware, mergeParams: true)

## Périmètre Atelier 4
Décliner chaque **scénario stratégique** en **scénarios opérationnels** : décrire le chemin d'attaque technique, identifier les **biens supports** impliqués et évaluer la **vraisemblance technique** (1-4).

---

## ÉTAPE 1 — Mise à jour du schéma Prisma

Ajouter dans `apps/api/prisma/schema.prisma` les modèles suivants, **après** le modèle `StrategicScenarioStakeholder` :

```prisma
// =====================
// ATELIER 4
// =====================

model OperationalScenario {
  id                  String   @id @default(cuid())
  studyId             String
  strategicScenarioId String
  description         String?
  technicalLikelihood Int      @default(1) // 1-4
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  study             Study             @relation(fields: [studyId], references: [id], onDelete: Cascade)
  strategicScenario StrategicScenario @relation(fields: [strategicScenarioId], references: [id], onDelete: Cascade)
  supportingAssets  OperationalScenarioSupportingAsset[]

  @@index([studyId])
  @@index([strategicScenarioId])
  @@map("operational_scenarios")
}

model OperationalScenarioSupportingAsset {
  operationalScenarioId String
  supportingAssetId     String

  operationalScenario OperationalScenario @relation(fields: [operationalScenarioId], references: [id], onDelete: Cascade)
  supportingAsset     SupportingAsset     @relation(fields: [supportingAssetId], references: [id], onDelete: Cascade)

  @@id([operationalScenarioId, supportingAssetId])
  @@map("operational_scenario_supporting_assets")
}
```

Ajouter les relations inverses dans les modèles existants :

Dans `model Study` :
```prisma
  operationalScenarios  OperationalScenario[]
```

Dans `model StrategicScenario` :
```prisma
  operationalScenarios  OperationalScenario[]
```

Dans `model SupportingAsset` :
```prisma
  operationalScenarios  OperationalScenarioSupportingAsset[]
```

---

## ÉTAPE 2 — Migration Prisma

```bash
cd ~/projects/Prosper/apps/api
pnpm prisma migrate dev --name atelier4
```

Vérifier que la migration s'applique sans erreur.

---

## ÉTAPE 3 — Service OperationalScenarioService

Créer `apps/api/src/services/OperationalScenarioService.ts` :

```typescript
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const CreateOperationalScenarioSchema = z.object({
  strategicScenarioId: z.string().cuid(),
  description: z.string().optional(),
  technicalLikelihood: z.number().int().min(1).max(4).default(1),
  supportingAssetIds: z.array(z.string().cuid()).default([]),
});

const UpdateOperationalScenarioSchema = z.object({
  description: z.string().optional(),
  technicalLikelihood: z.number().int().min(1).max(4).optional(),
  supportingAssetIds: z.array(z.string().cuid()).optional(),
});

export class OperationalScenarioService {
  static async create(studyId: string, data: z.infer<typeof CreateOperationalScenarioSchema>, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    const { supportingAssetIds, ...rest } = CreateOperationalScenarioSchema.parse(data);
    return prisma.operationalScenario.create({
      data: {
        ...rest,
        studyId,
        supportingAssets: {
          create: supportingAssetIds.map((id) => ({ supportingAssetId: id })),
        },
      },
      include: {
        strategicScenario: {
          include: {
            pair: { include: { riskSource: true, targetObjective: true } },
            fearEvent: true,
          },
        },
        supportingAssets: { include: { supportingAsset: true } },
      },
    });
  }

  static async getAll(studyId: string, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    return prisma.operationalScenario.findMany({
      where: { studyId },
      include: {
        strategicScenario: {
          include: {
            pair: { include: { riskSource: true, targetObjective: true } },
            fearEvent: true,
          },
        },
        supportingAssets: { include: { supportingAsset: true } },
      },
    });
  }

  static async update(id: string, data: z.infer<typeof UpdateOperationalScenarioSchema>, userId: string) {
    const os = await prisma.operationalScenario.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(os.studyId, userId);
    const { supportingAssetIds, ...rest } = UpdateOperationalScenarioSchema.parse(data);
    return prisma.operationalScenario.update({
      where: { id },
      data: {
        ...rest,
        ...(supportingAssetIds !== undefined && {
          supportingAssets: {
            deleteMany: {},
            create: supportingAssetIds.map((sid) => ({ supportingAssetId: sid })),
          },
        }),
      },
      include: {
        strategicScenario: {
          include: {
            pair: { include: { riskSource: true, targetObjective: true } },
            fearEvent: true,
          },
        },
        supportingAssets: { include: { supportingAsset: true } },
      },
    });
  }

  static async delete(id: string, userId: string) {
    const os = await prisma.operationalScenario.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(os.studyId, userId);
    return prisma.operationalScenario.delete({ where: { id } });
  }

  private static async validateStudyAccess(studyId: string, userId: string) {
    const study = await prisma.study.findUniqueOrThrow({ where: { id: studyId } });
    if (study.ownerId !== userId) {
      const su = await prisma.studyUser.findFirst({ where: { studyId, userId } });
      if (!su) throw new Error('Not authorized');
    }
  }
}
```

---

## ÉTAPE 4 — Controller OperationalScenarioController

Créer `apps/api/src/controllers/OperationalScenarioController.ts` :

```typescript
import { Request, Response } from 'express';
import { OperationalScenarioService } from '../services/OperationalScenarioService';

export class OperationalScenarioController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const result = await OperationalScenarioService.create(req.params.studyId, req.body, req.userId!);
      res.status(201).json(result);
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const result = await OperationalScenarioService.getAll(req.params.studyId, req.userId!);
      res.json(result);
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const result = await OperationalScenarioService.update(req.params.id, req.body, req.userId!);
      res.json(result);
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      await OperationalScenarioService.delete(req.params.id, req.userId!);
      res.status(204).send();
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }
}
```

---

## ÉTAPE 5 — Route operationalScenarios

Créer `apps/api/src/routes/operationalScenarios.ts` :

```typescript
import { Router } from 'express';
import { OperationalScenarioController } from '../controllers/OperationalScenarioController';
import { authMiddleware } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.post('/', authMiddleware, OperationalScenarioController.create);
router.get('/', authMiddleware, OperationalScenarioController.getAll);
router.patch('/:id', authMiddleware, OperationalScenarioController.update);
router.delete('/:id', authMiddleware, OperationalScenarioController.delete);

export default router;
```

---

## ÉTAPE 6 — Monter la route dans index.ts

Dans `apps/api/src/index.ts`, ajouter **après les routes Atelier 3** :

```typescript
import operationalScenariosRoutes from './routes/operationalScenarios';

// Atelier 4
app.use('/api/studies/:studyId/operational-scenarios', operationalScenariosRoutes);
```

---

## ÉTAPE 7 — Hook Frontend useOperationalScenarios

Créer `apps/web/src/hooks/useOperationalScenarios.ts` :

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface SupportingAssetRef {
  supportingAsset: { id: string; name: string; type: string };
}

interface StrategicScenarioRef {
  id: string;
  likelihood: number;
  pair: {
    riskSource: { name: string };
    targetObjective: { description: string };
  };
  fearEvent: { description: string };
}

export interface OperationalScenario {
  id: string;
  studyId: string;
  strategicScenarioId: string;
  description?: string;
  technicalLikelihood: number;
  strategicScenario: StrategicScenarioRef;
  supportingAssets: SupportingAssetRef[];
}

export function useOperationalScenarios(studyId: string) {
  const { accessToken } = useAuth();
  const [scenarios, setScenarios] = useState<OperationalScenario[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/studies/${studyId}/operational-scenarios`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setScenarios(await res.json());
    } finally { setLoading(false); }
  }, [studyId, accessToken]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = async (data: {
    strategicScenarioId: string;
    description?: string;
    technicalLikelihood: number;
    supportingAssetIds: string[];
  }) => {
    const res = await fetch(`/api/studies/${studyId}/operational-scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    if (res.ok) await fetchAll();
    return res;
  };

  const update = async (id: string, data: {
    description?: string;
    technicalLikelihood?: number;
    supportingAssetIds?: string[];
  }) => {
    const res = await fetch(`/api/studies/${studyId}/operational-scenarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    if (res.ok) await fetchAll();
    return res;
  };

  const remove = async (id: string) => {
    await fetch(`/api/studies/${studyId}/operational-scenarios/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await fetchAll();
  };

  return { scenarios, loading, create, update, remove, refetch: fetchAll };
}
```

---

## ÉTAPE 8 — Composant A4Form

Créer `apps/web/src/components/A4Form.tsx` en **état React contrôlé** (aucun `getElementById`) :

Structure en 2 onglets :
1. **Scénarios opérationnels** — liste + formulaire de création (scénario stratégique source, biens supports impliqués, vraisemblance technique 1-4, description)
2. **Synthèse** — matrice vraisemblance stratégique × vraisemblance technique pour tous les scénarios

```typescript
import { useState } from 'react';
import { useOperationalScenarios } from '../hooks/useOperationalScenarios';
import { useStrategicScenarios } from '../hooks/useStrategicScenarios';
import { useSupportingAssets } from '../hooks/useSupportingAssets';

type Tab = 'scenarios' | 'synthesis';

const LEVEL_LABELS: Record<number, string> = {
  1: '1 — Minimal',
  2: '2 — Significatif',
  3: '3 — Fort',
  4: '4 — Maximal',
};

const LEVEL_COLORS: Record<number, string> = {
  1: '#d4edda',
  2: '#fff3cd',
  3: '#ffd6a5',
  4: '#f8d7da',
};

export function A4Form({ studyId }: { studyId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('scenarios');

  const { scenarios: opScenarios, create: createOS, remove: removeOS } = useOperationalScenarios(studyId);
  const { scenarios: stratScenarios } = useStrategicScenarios(studyId);
  const { supportingAssets } = useSupportingAssets(studyId);

  // Formulaire création
  const [selectedStratId, setSelectedStratId] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [techLikelihood, setTechLikelihood] = useState(1);
  const [description, setDescription] = useState('');
  const [creationError, setCreationError] = useState('');

  const toggleAsset = (id: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreationError('');
    if (!selectedStratId) {
      setCreationError('Sélectionnez un scénario stratégique source.');
      return;
    }
    const res = await createOS({
      strategicScenarioId: selectedStratId,
      description: description || undefined,
      technicalLikelihood: techLikelihood,
      supportingAssetIds: selectedAssetIds,
    });
    if (res.ok) {
      setSelectedStratId('');
      setSelectedAssetIds([]);
      setTechLikelihood(1);
      setDescription('');
    } else {
      setCreationError('Erreur lors de la création du scénario opérationnel.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {(['scenarios', 'synthesis'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              background: activeTab === tab ? '#007bff' : '#eee',
              color: activeTab === tab ? 'white' : 'black',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            {tab === 'scenarios' ? 'Scénarios opérationnels' : 'Synthèse'}
          </button>
        ))}
      </div>

      {activeTab === 'scenarios' && (
        <div>
          <h3>Scénarios opérationnels</h3>

          {stratScenarios.length === 0 && (
            <p style={{ color: 'orange' }}>
              ⚠️ Aucun scénario stratégique disponible. Complétez d'abord l'Atelier 3.
            </p>
          )}

          <form onSubmit={handleCreate} style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '640px' }}>
            <label>
              Scénario stratégique source :
              <select
                value={selectedStratId}
                onChange={(e) => setSelectedStratId(e.target.value)}
                required
                style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%' }}
              >
                <option value="">— Choisir —</option>
                {stratScenarios.map((ss) => (
                  <option key={ss.id} value={ss.id}>
                    {ss.pair.riskSource.name} → {ss.pair.targetObjective.description.substring(0, 50)} (vrais. {ss.likelihood}/4)
                  </option>
                ))}
              </select>
            </label>

            <label>
              Vraisemblance technique :
              <select
                value={techLikelihood}
                onChange={(e) => setTechLikelihood(Number(e.target.value))}
                style={{ marginLeft: '8px', padding: '6px' }}
              >
                {[1, 2, 3, 4].map((v) => (
                  <option key={v} value={v}>{LEVEL_LABELS[v]}</option>
                ))}
              </select>
            </label>

            <div>
              <p style={{ margin: '0 0 6px', fontWeight: 'bold' }}>Biens supports impliqués :</p>
              {supportingAssets.length === 0 ? (
                <p style={{ color: '#999', fontSize: '13px' }}>Aucun bien support disponible (définissez-les dans l'Atelier 1).</p>
              ) : (
                supportingAssets.map((sa) => (
                  <label key={sa.id} style={{ display: 'block', marginBottom: '4px' }}>
                    <input
                      type="checkbox"
                      checked={selectedAssetIds.includes(sa.id)}
                      onChange={() => toggleAsset(sa.id)}
                      style={{ marginRight: '6px' }}
                    />
                    {sa.name} <span style={{ color: '#888', fontSize: '12px' }}>({sa.type})</span>
                  </label>
                ))
              )}
            </div>

            <label>
              Description du chemin d'attaque (optionnel) :
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: exploitation de la vulnérabilité CVE-XXXX sur le composant Y..."
                style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%', height: '80px' }}
              />
            </label>

            {creationError && <p style={{ color: 'red', margin: 0 }}>{creationError}</p>}

            <button type="submit" style={{ padding: '8px 16px', alignSelf: 'flex-start' }}>
              + Créer scénario opérationnel
            </button>
          </form>

          {opScenarios.length === 0 ? (
            <p style={{ color: '#999' }}>Aucun scénario opérationnel créé.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Scénario stratégique source</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Biens supports</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Vrais. tech.</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}></th>
                </tr>
              </thead>
              <tbody>
                {opScenarios.map((os) => (
                  <tr key={os.id}>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
                      {os.strategicScenario.pair.riskSource.name} → {os.strategicScenario.pair.targetObjective.description.substring(0, 40)}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
                      {os.supportingAssets.map((a) => a.supportingAsset.name).join(', ') || '—'}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: LEVEL_COLORS[os.technicalLikelihood] }}>
                      {os.technicalLikelihood}/4
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '13px', maxWidth: '200px' }}>
                      {os.description?.substring(0, 80) || '—'}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                      <button
                        onClick={() => removeOS(os.id)}
                        style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'synthesis' && (
        <div>
          <h3>Synthèse — Matrice vraisemblance</h3>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
            Croisement vraisemblance stratégique (scénario source) × vraisemblance technique (scénario opérationnel).
          </p>

          {opScenarios.length === 0 ? (
            <p style={{ color: '#999' }}>Aucun scénario opérationnel à afficher.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Scénario opérationnel</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Vrais. strat.</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Vrais. tech.</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Niveau global</th>
                </tr>
              </thead>
              <tbody>
                {opScenarios.map((os) => {
                  const stratLikelihood = os.strategicScenario.likelihood;
                  const globalLevel = Math.max(stratLikelihood, os.technicalLikelihood);
                  return (
                    <tr key={os.id}>
                      <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
                        {os.strategicScenario.pair.riskSource.name} → {os.strategicScenario.fearEvent.description.substring(0, 50)}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: LEVEL_COLORS[stratLikelihood] }}>
                        {stratLikelihood}/4
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: LEVEL_COLORS[os.technicalLikelihood] }}>
                        {os.technicalLikelihood}/4
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', background: LEVEL_COLORS[globalLevel] }}>
                        {globalLevel}/4
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## ÉTAPE 9 — Activer Atelier 4 dans AtlierLayout

Dans `apps/web/src/components/AtlierLayout.tsx` :

Remplacer :
```typescript
import { A1Form } from './A1Form';
import { A2Form } from './A2Form';
import { A3Form } from './A3Form';
```
par :
```typescript
import { A1Form } from './A1Form';
import { A2Form } from './A2Form';
import { A3Form } from './A3Form';
import { A4Form } from './A4Form';
```

Modifier `disabled` :
```typescript
disabled={i > 4} // Ateliers 1 à 4 activés
```

Ajouter le rendu conditionnel :
```typescript
{activeAtlier === 4 && <A4Form studyId={studyId} />}
```

---

## ÉTAPE 10 — Fermer les issues GitHub

Vérifier les numéros exacts d'abord :
```bash
gh issue list --repo emi5650/Prosper --label atelier-4
```

Puis fermer (remplacer `<N>` par les numéros réels) :
```bash
gh issue close <N> --repo emi5650/Prosper --comment "Implémenté : modèle OperationalScenario + migration atelier4"          # A4-01
gh issue close <N> --repo emi5650/Prosper --comment "Implémenté : OperationalScenarioService + Controller + Route REST"       # A4-02
gh issue close <N> --repo emi5650/Prosper --comment "Implémenté : vraisemblance technique 1-4 + liaison biens supports"        # A4-03
gh issue close <N> --repo emi5650/Prosper --comment "Implémenté : A4Form (2 onglets) + activation Atelier 4 dans AtlierLayout" # A4-04
```

---

## ÉTAPE 11 — Commit et push

```bash
cd ~/projects/Prosper
git add .
git commit -m "feat: Phase 5 — Atelier 4 (scénarios opérationnels, vraisemblance technique)"
git push origin main
```

---

## VÉRIFICATION FINALE

1. ✅ Migration `atelier4` appliquée sans erreur
2. ✅ `GET /api/studies/:studyId/operational-scenarios` répond 200 (includes imbriqués)
3. ✅ `POST /api/studies/:studyId/operational-scenarios` crée avec biens supports
4. ✅ `PATCH /api/studies/:studyId/operational-scenarios/:id` met à jour vraisemblance et biens supports
5. ✅ `DELETE /api/studies/:studyId/operational-scenarios/:id` supprime correctement
6. ✅ Atelier 4 accessible dans le frontend (onglet activé)
7. ✅ Formulaire : sélection scénario stratégique + biens supports (checkboxes) + vraisemblance technique
8. ✅ Onglet Synthèse : matrice vraisemblance avec codage couleur
9. ✅ Issues A4-01 à A4-04 fermées sur GitHub
10. ✅ Commit poussé sur GitHub

Rapporte tout problème ou déviation au plan.

---

## RAPPORT DE DÉVELOPPEMENT (OBLIGATOIRE)

À la fin de l'exécution, créer le fichier `RETEX/phase5-atelier4-2026-04-27.md` avec le contenu suivant :

```markdown
# Rapport Phase 5 — Atelier 4 (Scénarios opérationnels)
Date : 2026-04-27

## Résumé
- Étapes exécutées : [liste des étapes complétées]
- Étapes échouées ou contournées : [liste avec raisons]

## Fichiers créés ou modifiés
- [chemin/fichier] — [description courte]
- ...

## Incidents rencontrés
| # | Description | Solution appliquée |
|---|-------------|-------------------|
| 1 | ...         | ...               |

## Décisions techniques prises
- ...

## État final
- [ ] Migration `atelier4` appliquée
- [ ] API Atelier 4 fonctionnelle (OperationalScenario CRUD + liaison biens supports)
- [ ] Frontend Atelier 4 activé et fonctionnel
- [ ] Issues A4-01 à A4-04 fermées sur GitHub
- [ ] Commit poussé sur GitHub

## Prochaines étapes recommandées
- Phase 6 : Atelier 5 (Traitement du risque — mesures de sécurité, plan de traitement)
- Issues à traiter : A5-01 et suivantes (labels atelier-5, P2)
```

Ce fichier sert de RETEX et doit être commité avec le reste du code.
