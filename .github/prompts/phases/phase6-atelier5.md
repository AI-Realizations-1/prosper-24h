# Prompt Agent — Phase 6 : Atelier 5 (Traitement du risque)

## Contexte et prérequis
- Répertoire : ~/projects/Prosper/
- **Phase 5 complétée** : Atelier 4 (OperationalScenario, vraisemblance technique) fonctionnel
- Commit de référence : `82a2dcf` (feat: Phase 5 — Atelier 4)
- Issues GitHub à fermer : A5-01 (#37), A5-02 (#38), A5-03 (#39), A5-04 (#40), A5-05 (#41), A5-06 (#46) (labels atelier-5, P1)
- Pattern établi : Service (Prisma + Zod) → Controller (parse + try/catch) → Route (authMiddleware, mergeParams: true)

## Périmètre Atelier 5
Pour chaque **scénario opérationnel**, dériver un **risque** (niveau = technicalLikelihood du scénario), décider du **traitement** (Réduction, Acceptation, Transfert, Refus), définir des **mesures de sécurité** si traitement = REDUCTION, évaluer le **risque résiduel** et produire un **plan de traitement** priorisé.

---

## ÉTAPE 1 — Mise à jour du schéma Prisma

Ajouter dans `apps/api/prisma/schema.prisma` les éléments suivants, **après** le modèle `OperationalScenarioSupportingAsset` :

```prisma
// =====================
// ATELIER 5
// =====================

model Risk {
  id                    String            @id @default(cuid())
  studyId               String
  operationalScenarioId String            @unique
  level                 Int               @default(1) // 1-4
  treatmentDecision     TreatmentDecision @default(PENDING)
  residualLevel         Int?              // 1-4 après traitement
  justification         String?
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  study               Study               @relation(fields: [studyId], references: [id], onDelete: Cascade)
  operationalScenario OperationalScenario @relation(fields: [operationalScenarioId], references: [id], onDelete: Cascade)
  securityMeasures    SecurityMeasure[]

  @@index([studyId])
  @@map("risks")
}

enum TreatmentDecision {
  PENDING
  REDUCTION
  ACCEPTANCE
  TRANSFER
  REFUSAL
}

model SecurityMeasure {
  id          String        @id @default(cuid())
  studyId     String
  riskId      String
  name        String
  description String?
  type        String        // PREVENTIVE, DETECTIVE, CORRECTIVE
  priority    Int           @default(2) // 1=HIGH 2=MEDIUM 3=LOW
  status      MeasureStatus @default(PLANNED)
  dueDate     DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  study Study @relation(fields: [studyId], references: [id], onDelete: Cascade)
  risk  Risk  @relation(fields: [riskId], references: [id], onDelete: Cascade)

  @@index([studyId])
  @@index([riskId])
  @@map("security_measures")
}

enum MeasureStatus {
  PLANNED
  IN_PROGRESS
  IMPLEMENTED
  VERIFIED
}
```

Ajouter les relations inverses dans les modèles existants :

Dans `model Study` (après `operationalScenarios`) :
```prisma
  risks            Risk[]
  securityMeasures SecurityMeasure[]
```

Dans `model OperationalScenario` (après `supportingAssets`) :
```prisma
  risk Risk?
```

---

## ÉTAPE 2 — Migration Prisma

```bash
cd ~/projects/Prosper/apps/api
pnpm prisma migrate dev --name atelier5
```

Vérifier que la migration s'applique sans erreur.

---

## ÉTAPE 3 — RiskService

Créer `apps/api/src/services/RiskService.ts` :

```typescript
import { PrismaClient, TreatmentDecision } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const CreateRiskSchema = z.object({
  operationalScenarioId: z.string().cuid(),
  level: z.number().int().min(1).max(4),
  treatmentDecision: z.nativeEnum(TreatmentDecision).default('PENDING'),
  residualLevel: z.number().int().min(1).max(4).optional(),
  justification: z.string().optional(),
});

const UpdateRiskSchema = z.object({
  level: z.number().int().min(1).max(4).optional(),
  treatmentDecision: z.nativeEnum(TreatmentDecision).optional(),
  residualLevel: z.number().int().min(1).max(4).optional(),
  justification: z.string().optional(),
});

const riskIncludes = {
  operationalScenario: {
    include: {
      strategicScenario: {
        include: {
          pair: { include: { riskSource: true, targetObjective: true } },
          fearEvent: true,
        },
      },
      supportingAssets: { include: { supportingAsset: true } },
    },
  },
  securityMeasures: true,
};

export class RiskService {
  static async create(studyId: string, data: z.infer<typeof CreateRiskSchema>, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    const parsed = CreateRiskSchema.parse(data);
    return prisma.risk.create({
      data: { ...parsed, studyId },
      include: riskIncludes,
    });
  }

  static async getAll(studyId: string, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    return prisma.risk.findMany({
      where: { studyId },
      include: riskIncludes,
    });
  }

  static async update(id: string, data: z.infer<typeof UpdateRiskSchema>, userId: string) {
    const risk = await prisma.risk.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(risk.studyId, userId);
    const parsed = UpdateRiskSchema.parse(data);
    return prisma.risk.update({
      where: { id },
      data: parsed,
      include: riskIncludes,
    });
  }

  static async delete(id: string, userId: string) {
    const risk = await prisma.risk.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(risk.studyId, userId);
    return prisma.risk.delete({ where: { id } });
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

## ÉTAPE 4 — SecurityMeasureService

Créer `apps/api/src/services/SecurityMeasureService.ts` :

```typescript
import { PrismaClient, MeasureStatus } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const CreateMeasureSchema = z.object({
  riskId: z.string().cuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE']),
  priority: z.number().int().min(1).max(3).default(2),
  status: z.nativeEnum(MeasureStatus).default('PLANNED'),
  dueDate: z.string().datetime().optional(),
});

const UpdateMeasureSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE']).optional(),
  priority: z.number().int().min(1).max(3).optional(),
  status: z.nativeEnum(MeasureStatus).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

export class SecurityMeasureService {
  static async create(studyId: string, data: z.infer<typeof CreateMeasureSchema>, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    const { dueDate, ...rest } = CreateMeasureSchema.parse(data);
    return prisma.securityMeasure.create({
      data: {
        ...rest,
        studyId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
    });
  }

  static async getAll(studyId: string, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    return prisma.securityMeasure.findMany({
      where: { studyId },
      include: { risk: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  static async update(id: string, data: z.infer<typeof UpdateMeasureSchema>, userId: string) {
    const measure = await prisma.securityMeasure.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(measure.studyId, userId);
    const { dueDate, ...rest } = UpdateMeasureSchema.parse(data);
    return prisma.securityMeasure.update({
      where: { id },
      data: {
        ...rest,
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
    });
  }

  static async delete(id: string, userId: string) {
    const measure = await prisma.securityMeasure.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(measure.studyId, userId);
    return prisma.securityMeasure.delete({ where: { id } });
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

## ÉTAPE 5 — Controllers

Créer `apps/api/src/controllers/RiskController.ts` :

```typescript
import { Request, Response } from 'express';
import { RiskService } from '../services/RiskService';

export class RiskController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const result = await RiskService.create(req.params.studyId, req.body, req.userId!);
      res.status(201).json(result);
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const result = await RiskService.getAll(req.params.studyId, req.userId!);
      res.json(result);
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const result = await RiskService.update(req.params.id, req.body, req.userId!);
      res.json(result);
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      await RiskService.delete(req.params.id, req.userId!);
      res.status(204).send();
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }
}
```

Créer `apps/api/src/controllers/SecurityMeasureController.ts` :

```typescript
import { Request, Response } from 'express';
import { SecurityMeasureService } from '../services/SecurityMeasureService';

export class SecurityMeasureController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const result = await SecurityMeasureService.create(req.params.studyId, req.body, req.userId!);
      res.status(201).json(result);
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const result = await SecurityMeasureService.getAll(req.params.studyId, req.userId!);
      res.json(result);
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const result = await SecurityMeasureService.update(req.params.id, req.body, req.userId!);
      res.json(result);
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      await SecurityMeasureService.delete(req.params.id, req.userId!);
      res.status(204).send();
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }
}
```

---

## ÉTAPE 6 — Routes

Créer `apps/api/src/routes/risks.ts` :

```typescript
import { Router } from 'express';
import { RiskController } from '../controllers/RiskController';
import { authMiddleware } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.post('/', authMiddleware, RiskController.create);
router.get('/', authMiddleware, RiskController.getAll);
router.patch('/:id', authMiddleware, RiskController.update);
router.delete('/:id', authMiddleware, RiskController.delete);

export default router;
```

Créer `apps/api/src/routes/securityMeasures.ts` :

```typescript
import { Router } from 'express';
import { SecurityMeasureController } from '../controllers/SecurityMeasureController';
import { authMiddleware } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.post('/', authMiddleware, SecurityMeasureController.create);
router.get('/', authMiddleware, SecurityMeasureController.getAll);
router.patch('/:id', authMiddleware, SecurityMeasureController.update);
router.delete('/:id', authMiddleware, SecurityMeasureController.delete);

export default router;
```

---

## ÉTAPE 7 — Monter les routes dans index.ts

Dans `apps/api/src/index.ts`, ajouter **après les routes Atelier 4** :

```typescript
import risksRoutes from './routes/risks';
import securityMeasuresRoutes from './routes/securityMeasures';

// Atelier 5
app.use('/api/studies/:studyId/risks', risksRoutes);
app.use('/api/studies/:studyId/security-measures', securityMeasuresRoutes);
```

---

## ÉTAPE 8 — Hooks Frontend

Créer `apps/web/src/hooks/useRisks.ts` :

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export interface Risk {
  id: string;
  studyId: string;
  operationalScenarioId: string;
  level: number;
  treatmentDecision: 'PENDING' | 'REDUCTION' | 'ACCEPTANCE' | 'TRANSFER' | 'REFUSAL';
  residualLevel?: number;
  justification?: string;
  operationalScenario: {
    id: string;
    description?: string;
    technicalLikelihood: number;
    strategicScenario: {
      likelihood: number;
      pair: { riskSource: { name: string }; targetObjective: { description: string } };
      fearEvent: { description: string };
    };
    supportingAssets: Array<{ supportingAsset: { name: string } }>;
  };
  securityMeasures: Array<{ id: string; name: string; status: string; priority: number }>;
}

export function useRisks(studyId: string) {
  const { accessToken } = useAuth();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/studies/${studyId}/risks`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setRisks(await res.json());
    } finally { setLoading(false); }
  }, [studyId, accessToken]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = async (data: {
    operationalScenarioId: string;
    level: number;
    treatmentDecision?: string;
    residualLevel?: number;
    justification?: string;
  }) => {
    const res = await fetch(`/api/studies/${studyId}/risks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    if (res.ok) await fetchAll();
    return res;
  };

  const update = async (id: string, data: {
    level?: number;
    treatmentDecision?: string;
    residualLevel?: number;
    justification?: string;
  }) => {
    const res = await fetch(`/api/studies/${studyId}/risks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    if (res.ok) await fetchAll();
    return res;
  };

  const remove = async (id: string) => {
    await fetch(`/api/studies/${studyId}/risks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await fetchAll();
  };

  return { risks, loading, create, update, remove, refetch: fetchAll };
}
```

Créer `apps/web/src/hooks/useSecurityMeasures.ts` :

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export interface SecurityMeasure {
  id: string;
  studyId: string;
  riskId: string;
  name: string;
  description?: string;
  type: 'PREVENTIVE' | 'DETECTIVE' | 'CORRECTIVE';
  priority: number;
  status: 'PLANNED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'VERIFIED';
  dueDate?: string;
  risk: { id: string; level: number; treatmentDecision: string };
}

export function useSecurityMeasures(studyId: string) {
  const { accessToken } = useAuth();
  const [measures, setMeasures] = useState<SecurityMeasure[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/studies/${studyId}/security-measures`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setMeasures(await res.json());
    } finally { setLoading(false); }
  }, [studyId, accessToken]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = async (data: {
    riskId: string;
    name: string;
    description?: string;
    type: string;
    priority?: number;
    status?: string;
    dueDate?: string;
  }) => {
    const res = await fetch(`/api/studies/${studyId}/security-measures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    if (res.ok) await fetchAll();
    return res;
  };

  const update = async (id: string, data: {
    name?: string;
    description?: string;
    type?: string;
    priority?: number;
    status?: string;
    dueDate?: string | null;
  }) => {
    const res = await fetch(`/api/studies/${studyId}/security-measures/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    if (res.ok) await fetchAll();
    return res;
  };

  const remove = async (id: string) => {
    await fetch(`/api/studies/${studyId}/security-measures/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await fetchAll();
  };

  return { measures, loading, create, update, remove, refetch: fetchAll };
}
```

---

## ÉTAPE 9 — Composant A5Form

Créer `apps/web/src/components/A5Form.tsx` en **état React contrôlé** (aucun `getElementById`).

Structure en 4 onglets :
1. **Risques** — liste + formulaire de création
2. **Mesures** — formulaire de création + liste triée par priorité
3. **Plan de traitement** — vue consolidée par décision
4. **Synthèse** — matrice niveau initial vs résiduel + compteurs

```typescript
import { useState } from 'react';
import { useRisks } from '../hooks/useRisks';
import { useSecurityMeasures } from '../hooks/useSecurityMeasures';
import { useOperationalScenarios } from '../hooks/useOperationalScenarios';

type Tab = 'risks' | 'measures' | 'plan' | 'synthesis';

const TREATMENT_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  REDUCTION: 'Réduction',
  ACCEPTANCE: 'Acceptation',
  TRANSFER: 'Transfert',
  REFUSAL: 'Refus',
};
const TREATMENT_OPTIONS = ['PENDING', 'REDUCTION', 'ACCEPTANCE', 'TRANSFER', 'REFUSAL'];
const PRIORITY_LABELS: Record<number, string> = { 1: 'Haute', 2: 'Moyenne', 3: 'Basse' };
const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planifiée', IN_PROGRESS: 'En cours', IMPLEMENTED: 'Implémentée', VERIFIED: 'Vérifiée',
};
const STATUS_OPTIONS = ['PLANNED', 'IN_PROGRESS', 'IMPLEMENTED', 'VERIFIED'];
const TYPE_LABELS: Record<string, string> = {
  PREVENTIVE: 'Préventive', DETECTIVE: 'Détective', CORRECTIVE: 'Corrective',
};
const LEVEL_COLORS: Record<number, string> = {
  1: '#d4edda', 2: '#fff3cd', 3: '#ffd6a5', 4: '#f8d7da',
};

export function A5Form({ studyId }: { studyId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('risks');
  const { risks, create: createRisk, update: updateRisk, remove: removeRisk } = useRisks(studyId);
  const { measures, create: createMeasure, update: updateMeasure, remove: removeMeasure } = useSecurityMeasures(studyId);
  const { scenarios: opScenarios } = useOperationalScenarios(studyId);

  // Formulaire Risque
  const [riskOsId, setRiskOsId] = useState('');
  const [riskLevel, setRiskLevel] = useState(1);
  const [riskDecision, setRiskDecision] = useState('PENDING');
  const [riskResidual, setRiskResidual] = useState('');
  const [riskJustification, setRiskJustification] = useState('');
  const [riskError, setRiskError] = useState('');

  // Formulaire Mesure
  const [mRiskId, setMRiskId] = useState('');
  const [mName, setMName] = useState('');
  const [mDescription, setMDescription] = useState('');
  const [mType, setMType] = useState('PREVENTIVE');
  const [mPriority, setMPriority] = useState(2);
  const [mStatus, setMStatus] = useState('PLANNED');
  const [mDueDate, setMDueDate] = useState('');
  const [mError, setMError] = useState('');

  const osWithoutRisk = opScenarios.filter(
    (os) => !risks.some((r) => r.operationalScenarioId === os.id)
  );
  const reductionRisks = risks.filter((r) => r.treatmentDecision === 'REDUCTION');

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setRiskError('');
    if (!riskOsId) { setRiskError('Sélectionnez un scénario opérationnel.'); return; }
    const res = await createRisk({
      operationalScenarioId: riskOsId,
      level: riskLevel,
      treatmentDecision: riskDecision,
      residualLevel: riskResidual ? Number(riskResidual) : undefined,
      justification: riskJustification || undefined,
    });
    if (res.ok) {
      setRiskOsId(''); setRiskLevel(1); setRiskDecision('PENDING');
      setRiskResidual(''); setRiskJustification('');
    } else { setRiskError('Erreur lors de la création du risque.'); }
  };

  const handleCreateMeasure = async (e: React.FormEvent) => {
    e.preventDefault();
    setMError('');
    if (!mRiskId) { setMError('Sélectionnez un risque.'); return; }
    if (!mName.trim()) { setMError('Le nom est obligatoire.'); return; }
    const res = await createMeasure({
      riskId: mRiskId, name: mName,
      description: mDescription || undefined,
      type: mType, priority: mPriority, status: mStatus,
      dueDate: mDueDate ? new Date(mDueDate).toISOString() : undefined,
    });
    if (res.ok) {
      setMRiskId(''); setMName(''); setMDescription('');
      setMType('PREVENTIVE'); setMPriority(2); setMStatus('PLANNED'); setMDueDate('');
    } else { setMError('Erreur lors de la création de la mesure.'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {([['risks', 'Risques'], ['measures', 'Mesures'], ['plan', 'Plan de traitement'], ['synthesis', 'Synthèse']] as [Tab, string][]).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 16px',
            background: activeTab === tab ? '#007bff' : '#eee',
            color: activeTab === tab ? 'white' : 'black',
            cursor: 'pointer', border: 'none',
          }}>{label}</button>
        ))}
      </div>

      {activeTab === 'risks' && (
        <div>
          <h3>Risques</h3>
          {opScenarios.length === 0 && (
            <p style={{ color: 'orange' }}>⚠️ Aucun scénario opérationnel. Complétez d'abord l'Atelier 4.</p>
          )}
          <form onSubmit={handleCreateRisk} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '640px', marginBottom: '24px' }}>
            <label>
              Scénario opérationnel :
              <select value={riskOsId} onChange={(e) => {
                setRiskOsId(e.target.value);
                const os = osWithoutRisk.find(o => o.id === e.target.value);
                if (os) setRiskLevel(os.technicalLikelihood);
              }} required style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%' }}>
                <option value="">— Choisir —</option>
                {osWithoutRisk.map((os) => (
                  <option key={os.id} value={os.id}>
                    {os.strategicScenario.pair.riskSource.name} → {os.strategicScenario.fearEvent.description.substring(0, 50)} (vrais. {os.technicalLikelihood}/4)
                  </option>
                ))}
              </select>
            </label>
            <label>
              Niveau de risque (1-4) :
              <select value={riskLevel} onChange={(e) => setRiskLevel(Number(e.target.value))} style={{ marginLeft: '8px', padding: '6px' }}>
                {[1, 2, 3, 4].map((v) => <option key={v} value={v}>{v}/4</option>)}
              </select>
            </label>
            <label>
              Décision de traitement :
              <select value={riskDecision} onChange={(e) => setRiskDecision(e.target.value)} style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%' }}>
                {TREATMENT_OPTIONS.map((d) => <option key={d} value={d}>{TREATMENT_LABELS[d]}</option>)}
              </select>
            </label>
            {riskDecision !== 'PENDING' && (
              <label>
                Niveau résiduel (optionnel) :
                <select value={riskResidual} onChange={(e) => setRiskResidual(e.target.value)} style={{ marginLeft: '8px', padding: '6px' }}>
                  <option value="">—</option>
                  {[1, 2, 3, 4].map((v) => <option key={v} value={v}>{v}/4</option>)}
                </select>
              </label>
            )}
            <label>
              Justification (optionnel) :
              <textarea value={riskJustification} onChange={(e) => setRiskJustification(e.target.value)}
                style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%', height: '60px' }} />
            </label>
            {riskError && <p style={{ color: 'red', margin: 0 }}>{riskError}</p>}
            <button type="submit" style={{ padding: '8px 16px', alignSelf: 'flex-start' }}>+ Créer risque</button>
          </form>

          {risks.length === 0 ? (
            <p style={{ color: '#999' }}>Aucun risque créé.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Scénario source</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Niveau</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Décision</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Résiduel</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}></th>
                </tr>
              </thead>
              <tbody>
                {risks.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
                      {r.operationalScenario.strategicScenario.pair.riskSource.name} → {r.operationalScenario.strategicScenario.fearEvent.description.substring(0, 50)}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: LEVEL_COLORS[r.level] }}>{r.level}/4</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{TREATMENT_LABELS[r.treatmentDecision]}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: r.residualLevel ? LEVEL_COLORS[r.residualLevel] : 'transparent' }}>
                      {r.residualLevel ? `${r.residualLevel}/4` : '—'}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                      <button onClick={() => removeRisk(r.id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'measures' && (
        <div>
          <h3>Mesures de sécurité</h3>
          {reductionRisks.length === 0 ? (
            <p style={{ color: 'orange' }}>⚠️ Aucun risque avec décision "Réduction". Définissez d'abord des risques REDUCTION dans l'onglet Risques.</p>
          ) : (
            <form onSubmit={handleCreateMeasure} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '640px', marginBottom: '24px' }}>
              <label>
                Risque à traiter :
                <select value={mRiskId} onChange={(e) => setMRiskId(e.target.value)} required style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%' }}>
                  <option value="">— Choisir —</option>
                  {reductionRisks.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.operationalScenario.strategicScenario.pair.riskSource.name} (niveau {r.level}/4)
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nom de la mesure :
                <input type="text" value={mName} onChange={(e) => setMName(e.target.value)} required
                  style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%' }} />
              </label>
              <label>
                Description (optionnel) :
                <textarea value={mDescription} onChange={(e) => setMDescription(e.target.value)}
                  style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%', height: '60px' }} />
              </label>
              <label>
                Type :
                <select value={mType} onChange={(e) => setMType(e.target.value)} style={{ marginLeft: '8px', padding: '6px' }}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label>
                Priorité :
                <select value={mPriority} onChange={(e) => setMPriority(Number(e.target.value))} style={{ marginLeft: '8px', padding: '6px' }}>
                  {[1, 2, 3].map((v) => <option key={v} value={v}>{PRIORITY_LABELS[v]}</option>)}
                </select>
              </label>
              <label>
                Statut :
                <select value={mStatus} onChange={(e) => setMStatus(e.target.value)} style={{ marginLeft: '8px', padding: '6px' }}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </label>
              <label>
                Date d'échéance (optionnel) :
                <input type="date" value={mDueDate} onChange={(e) => setMDueDate(e.target.value)} style={{ marginLeft: '8px', padding: '6px' }} />
              </label>
              {mError && <p style={{ color: 'red', margin: 0 }}>{mError}</p>}
              <button type="submit" style={{ padding: '8px 16px', alignSelf: 'flex-start' }}>+ Créer mesure</button>
            </form>
          )}

          {measures.length === 0 ? (
            <p style={{ color: '#999' }}>Aucune mesure créée.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Nom</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Type</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Priorité</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Statut</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Échéance</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}></th>
                </tr>
              </thead>
              <tbody>
                {measures.map((m) => (
                  <tr key={m.id}>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '13px' }}>{m.name}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontSize: '13px' }}>{TYPE_LABELS[m.type]}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{PRIORITY_LABELS[m.priority]}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                      <select value={m.status} onChange={(e) => updateMeasure(m.id, { status: e.target.value })} style={{ padding: '4px' }}>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontSize: '13px' }}>
                      {m.dueDate ? new Date(m.dueDate).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                      <button onClick={() => removeMeasure(m.id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'plan' && (
        <div>
          <h3>Plan de traitement</h3>
          {risks.length === 0 ? (
            <p style={{ color: '#999' }}>Aucun risque à afficher.</p>
          ) : (
            TREATMENT_OPTIONS.filter((d) => risks.some((r) => r.treatmentDecision === d)).map((decision) => (
              <div key={decision} style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 8px', borderBottom: '2px solid #ddd', paddingBottom: '4px' }}>
                  {TREATMENT_LABELS[decision]} ({risks.filter((r) => r.treatmentDecision === decision).length})
                </h4>
                {risks.filter((r) => r.treatmentDecision === decision).map((r) => {
                  const riskMeasures = measures.filter((m) => m.riskId === r.id).sort((a, b) => a.priority - b.priority);
                  return (
                    <div key={r.id} style={{ border: '1px solid #eee', borderRadius: '4px', padding: '12px', marginBottom: '8px', background: LEVEL_COLORS[r.level] }}>
                      <p style={{ margin: '0 0 6px', fontWeight: 'bold', fontSize: '14px' }}>
                        {r.operationalScenario.strategicScenario.pair.riskSource.name} → {r.operationalScenario.strategicScenario.fearEvent.description.substring(0, 60)}
                        <span style={{ marginLeft: '8px', fontWeight: 'normal', fontSize: '12px' }}>
                          Niveau {r.level}/4{r.residualLevel ? ` → résiduel ${r.residualLevel}/4` : ''}
                        </span>
                      </p>
                      {r.justification && <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#555' }}>{r.justification}</p>}
                      {decision === 'REDUCTION' && (
                        riskMeasures.length === 0 ? (
                          <p style={{ color: 'orange', fontSize: '13px', margin: 0 }}>⚠️ Aucune mesure définie pour ce risque.</p>
                        ) : (
                          <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            {riskMeasures.map((m) => (
                              <li key={m.id} style={{ fontSize: '13px', marginBottom: '4px' }}>
                                <strong>{m.name}</strong> — {TYPE_LABELS[m.type]} — Priorité {PRIORITY_LABELS[m.priority]} — {STATUS_LABELS[m.status]}
                                {m.dueDate && ` — Échéance ${new Date(m.dueDate).toLocaleDateString('fr-FR')}`}
                              </li>
                            ))}
                          </ul>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'synthesis' && (
        <div>
          <h3>Synthèse</h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {[
              { label: 'Risques totaux', value: risks.length, color: '#007bff' },
              ...TREATMENT_OPTIONS.map((d) => ({
                label: TREATMENT_LABELS[d],
                value: risks.filter((r) => r.treatmentDecision === d).length,
                color: d === 'REDUCTION' ? '#dc3545' : d === 'ACCEPTANCE' ? '#ffc107' : d === 'TRANSFER' ? '#17a2b8' : d === 'REFUSAL' ? '#6c757d' : '#aaa',
              })),
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: '12px 20px', border: `2px solid ${color}`, borderRadius: '6px', textAlign: 'center', minWidth: '100px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color }}>{value}</div>
                <div style={{ fontSize: '12px', color: '#555' }}>{label}</div>
              </div>
            ))}
          </div>
          {measures.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
              {STATUS_OPTIONS.map((s) => (
                <div key={s} style={{ padding: '8px 16px', background: '#f0f0f0', borderRadius: '4px', fontSize: '13px' }}>
                  <strong>{measures.filter((m) => m.status === s).length}</strong> {STATUS_LABELS[s]}
                </div>
              ))}
            </div>
          )}
          {risks.length === 0 ? (
            <p style={{ color: '#999' }}>Aucun risque à afficher.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Scénario source</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Niveau initial</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Décision</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Niveau résiduel</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
                      {r.operationalScenario.strategicScenario.pair.riskSource.name} → {r.operationalScenario.strategicScenario.fearEvent.description.substring(0, 50)}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: LEVEL_COLORS[r.level] }}>{r.level}/4</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{TREATMENT_LABELS[r.treatmentDecision]}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: r.residualLevel ? LEVEL_COLORS[r.residualLevel] : '#f9f9f9' }}>
                      {r.residualLevel ? `${r.residualLevel}/4` : '—'}
                    </td>
                  </tr>
                ))}
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

## ÉTAPE 10 — Activer Atelier 5 dans AtlierLayout

Dans `apps/web/src/components/AtlierLayout.tsx` :

Ajouter l'import :
```typescript
import { A5Form } from './A5Form';
```

Modifier `disabled` :
```typescript
disabled={i > 5} // Ateliers 1 à 5 activés
```

Ajouter le rendu conditionnel :
```typescript
{activeAtlier === 5 && <A5Form studyId={studyId} />}
```

---

## ÉTAPE 11 — Fermer les issues GitHub

Vérifier les numéros exacts d'abord :
```bash
gh issue list --repo emi5650/Prosper --label atelier-5
```

Fermer (numéros attendus #37 à #41 + #46) :
```bash
gh issue close 37 --repo emi5650/Prosper --comment "Implémenté : modèle Risk + dérivation depuis OperationalScenario + migration atelier5"
gh issue close 38 --repo emi5650/Prosper --comment "Implémenté : onglet Synthèse A5Form — matrice risques avec codage couleur"
gh issue close 39 --repo emi5650/Prosper --comment "Implémenté : champ treatmentDecision (REDUCTION/ACCEPTANCE/TRANSFER/REFUSAL) + justification"
gh issue close 40 --repo emi5650/Prosper --comment "Implémenté : onglet Plan de traitement — mesures groupées par risque et triées par priorité"
gh issue close 41 --repo emi5650/Prosper --comment "Implémenté : champ residualLevel par risque + comparaison niveau initial vs résiduel dans Synthèse"
gh issue close 46 --repo emi5650/Prosper --comment "Implémenté : onglet Mesures — tableau de suivi avec statut PLANNED/IN_PROGRESS/IMPLEMENTED/VERIFIED"
```

---

## ÉTAPE 12 — Commit et push

```bash
cd ~/projects/Prosper
git add .
git commit -m "feat: Phase 6 — Atelier 5 (traitement du risque, mesures de sécurité, plan de traitement)"
git push origin main
```

---

## VÉRIFICATION FINALE

1. ✅ Migration `atelier5` appliquée sans erreur
2. ✅ `GET /api/studies/:studyId/risks` répond 200 avec includes OperationalScenario imbriqués
3. ✅ `POST /api/studies/:studyId/risks` crée un risque lié à un scénario opérationnel (contrainte `@unique`)
4. ✅ `PATCH /api/studies/:studyId/risks/:id` met à jour décision + niveau résiduel
5. ✅ `GET /api/studies/:studyId/security-measures` répond 200 trié par priorité
6. ✅ `POST /api/studies/:studyId/security-measures` crée une mesure liée à un risque
7. ✅ `PATCH /api/studies/:studyId/security-measures/:id` met à jour le statut inline
8. ✅ Atelier 5 accessible dans le frontend (onglet activé)
9. ✅ Onglet Risques : sélection scénario op sans risque existant + niveau pré-rempli + décision + résiduel conditionnel
10. ✅ Onglet Mesures : sélection risque REDUCTION uniquement + formulaire mesure complet
11. ✅ Onglet Plan de traitement : groupement par décision, mesures triées par priorité, changement statut inline
12. ✅ Onglet Synthèse : matrice niveau initial vs résiduel + compteurs par décision + mesures par statut
13. ✅ Issues A5-01 à A5-06 fermées sur GitHub
14. ✅ `pnpm --filter api build` + `pnpm --filter web build` sans erreur
15. ✅ Commit poussé sur GitHub

Rapporte tout problème ou déviation au plan.

---

## RAPPORT DE DÉVELOPPEMENT (OBLIGATOIRE)

À la fin de l'exécution, créer le fichier `RETEX/phase6-atelier5-2026-04-27.md` avec le contenu suivant :

```markdown
# Rapport Phase 6 — Atelier 5 (Traitement du risque)
Date : 2026-04-27

## Résumé
- Étapes exécutées : [liste]
- Étapes échouées ou contournées : [liste avec raisons]

## Fichiers créés ou modifiés
- [chemin/fichier] — [description courte]

## Incidents rencontrés
| # | Description | Solution appliquée |
|---|-------------|-------------------|
| 1 | ...         | ...               |

## Décisions techniques prises
- ...

## État final
- [ ] Migration `atelier5` appliquée
- [ ] API Atelier 5 fonctionnelle (Risk CRUD + SecurityMeasure CRUD)
- [ ] Frontend Atelier 5 activé (A5Form — 4 onglets)
- [ ] Issues A5-01 à A5-06 fermées sur GitHub
- [ ] Commit poussé sur GitHub

## Prochaines étapes recommandées
- Phase 7 : Fonctionnalités transverses (FT-01 à FT-07) — export PDF/Excel, tableau de bord global, gestion utilisateurs avancée
- Issues transverses : #1 à #7 (labels transverse, P0)
```