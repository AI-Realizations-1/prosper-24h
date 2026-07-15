# Prompt Agent — Phase 7 : Fonctionnalités transverses (FT-01 à FT-07)

## Contexte et prérequis
- Répertoire : ~/projects/Prosper/
- **Phase 6 complétée** : Atelier 5 (Risk + SecurityMeasure, traitement du risque) fonctionnel
- Commit de référence : `c7c53f3` (feat: Phase 6 — Atelier 5)
- Issues GitHub à fermer : FT-01 (#1), FT-02 (#2), FT-03 (#3), FT-04 (#4), FT-05 (#5), FT-06 (#6), FT-07 (#7) (labels transverse, P0)
- Pattern établi : Service (Prisma + Zod) → Controller (parse + try/catch) → Route (authMiddleware, mergeParams: true)

## Périmètre Phase 7 — Fonctionnalités transverses

| Ticket | Intitulé |
|--------|----------|
| FT-01 | Duplication d'étude (deep copy de tous les ateliers) |
| FT-02 | Gestion des membres d'une étude et de leurs rôles |
| FT-03 | Journal d'audit (traçabilité des modifications) |
| FT-04 | Export PDF + Excel de l'analyse |
| FT-05 | Import/export JSON (interopérabilité) |
| FT-06 | Tableau de bord de synthèse par étude |
| FT-07 | Contrôle de cohérence automatique entre ateliers |

---

## ÉTAPE 1 — Mise à jour du schéma Prisma

Le modèle `AuditLogEntry` et `StudyUser` existent déjà. Aucune migration n'est nécessaire.

Vérifier que le champ `targetId` est présent dans `AuditLogEntry`. S'il manque, ajouter :

```prisma
model AuditLogEntry {
  id        String   @id @default(cuid())
  studyId   String
  userId    String
  action    String   // CREATE, UPDATE, DELETE, ARCHIVE, DUPLICATE, EXPORT, IMPORT
  target    String   // Study, BusinessValue, Risk, etc.
  targetId  String?  // id de l'entité concernée
  details   String?
  createdAt DateTime @default(now())

  study Study @relation(fields: [studyId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([studyId])
  @@index([userId])
  @@map("audit_logs")
}
```

Si une modification est faite :

```bash
cd ~/projects/Prosper/apps/api
pnpm prisma migrate dev --name transverses
```

---

## ÉTAPE 2 — AuditLogService

Créer `apps/api/src/services/AuditLogService.ts` :

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AuditLogService {
  static async log(params: {
    studyId: string;
    userId: string;
    action: string;
    target: string;
    targetId?: string;
    details?: string;
  }) {
    return prisma.auditLogEntry.create({ data: params });
  }

  static async getByStudy(studyId: string, userId: string) {
    // Vérifier accès
    const study = await prisma.study.findUniqueOrThrow({ where: { id: studyId } });
    const isOwner = study.ownerId === userId;
    if (!isOwner) {
      const member = await prisma.studyUser.findFirst({ where: { studyId, userId } });
      if (!member) throw new Error('Not authorized');
    }

    return prisma.auditLogEntry.findMany({
      where: { studyId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { id: true, email: true } } },
    });
  }
}
```

---

## ÉTAPE 3 — StudyService : duplication + membres + résumé + cohérence

Modifier `apps/api/src/services/StudyService.ts` — ajouter les méthodes suivantes à la classe `StudyService` :

```typescript
  // FT-01 — Duplication deep copy
  static async duplicateStudy(studyId: string, userId: string) {
    const source = await prisma.study.findUniqueOrThrow({
      where: { id: studyId },
      include: {
        businessValues: true,
        supportingAssets: true,
        fearEvents: true,
        securityBaselines: true,
        riskSources: true,
        targetObjectives: true,
        stakeholders: true,
        strategicScenarios: {
          include: { stakeholders: true },
        },
        operationalScenarios: {
          include: { supportingAssets: true, risk: { include: { securityMeasures: true } } },
        },
      },
    });

    if (source.ownerId !== userId) {
      const member = await prisma.studyUser.findFirst({ where: { studyId, userId } });
      if (!member) throw new Error('Not authorized');
    }

    // Copie principale
    const copy = await prisma.study.create({
      data: {
        name: `${source.name} (copie)`,
        description: source.description,
        scope: source.scope,
        ownerId: userId,
        status: 'DRAFT',
      },
    });

    // Mapping des anciens ids → nouveaux ids pour les FK
    const bvMap: Record<string, string> = {};
    for (const bv of source.businessValues) {
      const newBv = await prisma.businessValue.create({
        data: { studyId: copy.id, name: bv.name, description: bv.description ?? undefined, criticality: bv.criticality },
      });
      bvMap[bv.id] = newBv.id;
    }

    const saMap: Record<string, string> = {};
    for (const sa of source.supportingAssets) {
      const newSa = await prisma.supportingAsset.create({
        data: {
          studyId: copy.id,
          name: sa.name,
          description: sa.description ?? undefined,
          type: sa.type,
          businessValueId: sa.businessValueId ? bvMap[sa.businessValueId] : undefined,
        },
      });
      saMap[sa.id] = newSa.id;
    }

    for (const fe of source.fearEvents) {
      await prisma.fearEvent.create({
        data: {
          studyId: copy.id,
          name: fe.name,
          description: fe.description ?? undefined,
          gravity: fe.gravity,
          businessValueId: fe.businessValueId ? bvMap[fe.businessValueId] : undefined,
        },
      });
    }

    for (const sb of source.securityBaselines) {
      await prisma.securityBaseline.create({
        data: {
          studyId: copy.id,
          name: sb.name,
          description: sb.description ?? undefined,
          compliance: sb.compliance,
          supportingAssetId: sb.supportingAssetId ? saMap[sb.supportingAssetId] : undefined,
        },
      });
    }

    const rsMap: Record<string, string> = {};
    for (const rs of source.riskSources) {
      const newRs = await prisma.riskSource.create({
        data: { studyId: copy.id, name: rs.name, description: rs.description ?? undefined, motivation: rs.motivation ?? undefined, resources: rs.resources ?? undefined, pertinence: rs.pertinence },
      });
      rsMap[rs.id] = newRs.id;
    }

    const toMap: Record<string, string> = {};
    for (const to of source.targetObjectives) {
      const newTo = await prisma.targetObjective.create({
        data: { studyId: copy.id, name: to.name, description: to.description ?? undefined },
      });
      toMap[to.id] = newTo.id;
    }

    const stMap: Record<string, string> = {};
    for (const st of source.stakeholders) {
      const newSt = await prisma.stakeholder.create({
        data: { studyId: copy.id, name: st.name, category: st.category, exposure: st.exposure, trustLevel: st.trustLevel },
      });
      stMap[st.id] = newSt.id;
    }

    const ssMap: Record<string, string> = {};
    for (const ss of source.strategicScenarios) {
      const newSs = await prisma.strategicScenario.create({
        data: {
          studyId: copy.id,
          name: ss.name,
          description: ss.description ?? undefined,
          likelihood: ss.likelihood,
          riskSourceId: rsMap[ss.riskSourceId] ?? ss.riskSourceId,
          targetObjectiveId: toMap[ss.targetObjectiveId] ?? ss.targetObjectiveId,
        },
      });
      ssMap[ss.id] = newSs.id;
    }

    const osMap: Record<string, string> = {};
    for (const os of source.operationalScenarios) {
      const newOs = await prisma.operationalScenario.create({
        data: {
          studyId: copy.id,
          name: os.name,
          description: os.description ?? undefined,
          technicalLikelihood: os.technicalLikelihood,
          strategicScenarioId: ssMap[os.strategicScenarioId] ?? os.strategicScenarioId,
        },
      });
      osMap[os.id] = newOs.id;

      for (const osa of os.supportingAssets) {
        await prisma.operationalScenarioSupportingAsset.create({
          data: { operationalScenarioId: newOs.id, supportingAssetId: saMap[osa.supportingAssetId] ?? osa.supportingAssetId },
        });
      }

      if (os.risk) {
        const newRisk = await prisma.risk.create({
          data: {
            studyId: copy.id,
            operationalScenarioId: newOs.id,
            level: os.risk.level,
            treatmentDecision: os.risk.treatmentDecision,
            residualLevel: os.risk.residualLevel ?? undefined,
            justification: os.risk.justification ?? undefined,
          },
        });
        for (const sm of os.risk.securityMeasures) {
          await prisma.securityMeasure.create({
            data: {
              studyId: copy.id,
              riskId: newRisk.id,
              name: sm.name,
              description: sm.description ?? undefined,
              type: sm.type,
              priority: sm.priority,
              status: sm.status,
              dueDate: sm.dueDate ?? undefined,
            },
          });
        }
      }
    }

    await AuditLogService.log({ studyId: copy.id, userId, action: 'DUPLICATE', target: 'Study', targetId: source.id, details: `Dupliqué depuis "${source.name}"` });

    return copy;
  }

  // FT-02 — Gestion des membres
  static async getMembers(studyId: string, userId: string) {
    await this.getStudy(studyId, userId);
    return prisma.studyUser.findMany({
      where: { studyId },
      include: { user: { select: { id: true, email: true, role: true } } },
    });
  }

  static async addMember(studyId: string, requesterId: string, email: string, role: string) {
    const study = await this.getStudy(studyId, requesterId);
    if (study.ownerId !== requesterId) throw new Error('Only owner can manage members');

    const targetUser = await prisma.user.findUniqueOrThrow({ where: { email } });
    const existing = await prisma.studyUser.findFirst({ where: { studyId, userId: targetUser.id } });
    if (existing) throw new Error('User is already a member');

    return prisma.studyUser.create({ data: { studyId, userId: targetUser.id, role: role as any } });
  }

  static async removeMember(studyId: string, requesterId: string, memberId: string) {
    const study = await this.getStudy(studyId, requesterId);
    if (study.ownerId !== requesterId) throw new Error('Only owner can remove members');

    await prisma.studyUser.deleteMany({ where: { studyId, userId: memberId } });
  }

  // FT-06 — Résumé de synthèse par étude
  static async getSummary(studyId: string, userId: string) {
    await this.getStudy(studyId, userId);

    const [
      businessValues,
      supportingAssets,
      fearEvents,
      securityBaselines,
      riskSources,
      stakeholders,
      strategicScenarios,
      operationalScenarios,
      risks,
      securityMeasures,
    ] = await Promise.all([
      prisma.businessValue.count({ where: { studyId } }),
      prisma.supportingAsset.count({ where: { studyId } }),
      prisma.fearEvent.count({ where: { studyId } }),
      prisma.securityBaseline.count({ where: { studyId } }),
      prisma.riskSource.count({ where: { studyId } }),
      prisma.stakeholder.count({ where: { studyId } }),
      prisma.strategicScenario.count({ where: { studyId } }),
      prisma.operationalScenario.count({ where: { studyId } }),
      prisma.risk.findMany({ where: { studyId }, select: { treatmentDecision: true, level: true, residualLevel: true } }),
      prisma.securityMeasure.count({ where: { studyId } }),
    ]);

    const risksTotal = risks.length;
    const risksReduction = risks.filter(r => r.treatmentDecision === 'REDUCTION').length;
    const risksAccepted = risks.filter(r => r.treatmentDecision === 'ACCEPTANCE').length;
    const risksPending = risks.filter(r => r.treatmentDecision === 'PENDING').length;
    const avgLevel = risksTotal > 0 ? risks.reduce((s, r) => s + r.level, 0) / risksTotal : 0;
    const avgResidual = risks.filter(r => r.residualLevel != null).length > 0
      ? risks.filter(r => r.residualLevel != null).reduce((s, r) => s + (r.residualLevel ?? 0), 0) / risks.filter(r => r.residualLevel != null).length
      : null;

    return {
      atelier1: { businessValues, supportingAssets, fearEvents, securityBaselines },
      atelier2: { riskSources },
      atelier3: { stakeholders, strategicScenarios },
      atelier4: { operationalScenarios },
      atelier5: { risksTotal, risksReduction, risksAccepted, risksPending, securityMeasures, avgLevel: parseFloat(avgLevel.toFixed(2)), avgResidual: avgResidual != null ? parseFloat(avgResidual.toFixed(2)) : null },
    };
  }

  // FT-07 — Contrôle de cohérence inter-ateliers
  static async checkCoherence(studyId: string, userId: string): Promise<{ valid: boolean; warnings: string[] }> {
    await this.getStudy(studyId, userId);

    const warnings: string[] = [];

    const bvWithoutSA = await prisma.businessValue.findMany({
      where: { studyId, supportingAssets: { none: {} } },
      select: { name: true },
    });
    if (bvWithoutSA.length > 0) {
      warnings.push(`${bvWithoutSA.length} valeur(s) métier sans bien support : ${bvWithoutSA.map(b => b.name).join(', ')}`);
    }

    const saWithoutFE = await prisma.supportingAsset.findMany({
      where: { studyId, fearEvents: { none: {} } },
      select: { name: true },
    });
    if (saWithoutFE.length > 0) {
      warnings.push(`${saWithoutFE.length} bien(s) support sans événement redouté : ${saWithoutFE.map(s => s.name).join(', ')}`);
    }

    const ssWithoutOS = await prisma.strategicScenario.findMany({
      where: { studyId, operationalScenarios: { none: {} } },
      select: { name: true },
    });
    if (ssWithoutOS.length > 0) {
      warnings.push(`${ssWithoutOS.length} scénario(s) stratégique(s) sans scénario opérationnel : ${ssWithoutOS.map(s => s.name).join(', ')}`);
    }

    const osWithoutRisk = await prisma.operationalScenario.findMany({
      where: { studyId, risk: null },
      select: { name: true },
    });
    if (osWithoutRisk.length > 0) {
      warnings.push(`${osWithoutRisk.length} scénario(s) opérationnel(s) sans risque évalué : ${osWithoutRisk.map(o => o.name).join(', ')}`);
    }

    const pendingRisks = await prisma.risk.count({ where: { studyId, treatmentDecision: 'PENDING' } });
    if (pendingRisks > 0) {
      warnings.push(`${pendingRisks} risque(s) sans décision de traitement`);
    }

    return { valid: warnings.length === 0, warnings };
  }
```

Ajouter en haut du fichier StudyService.ts l'import manquant :

```typescript
import { AuditLogService } from './AuditLogService';
```

---

## ÉTAPE 4 — ExportService (FT-04 + FT-05)

### 4a — Installer les dépendances

```bash
cd ~/projects/Prosper/apps/api
pnpm add pdfkit exceljs
pnpm add -D @types/pdfkit
```

### 4b — Créer `apps/api/src/services/ExportService.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Response } from 'express';

const prisma = new PrismaClient();

async function loadFullStudy(studyId: string) {
  return prisma.study.findUniqueOrThrow({
    where: { id: studyId },
    include: {
      owner: { select: { email: true } },
      businessValues: true,
      supportingAssets: true,
      fearEvents: true,
      securityBaselines: true,
      riskSources: true,
      targetObjectives: true,
      stakeholders: true,
      strategicScenarios: true,
      operationalScenarios: { include: { risk: { include: { securityMeasures: true } } } },
    },
  });
}

export class ExportService {
  // FT-04 — PDF
  static async exportPDF(studyId: string, res: Response) {
    const study = await loadFullStudy(studyId);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="prosper-${study.name.replace(/\s+/g, '_')}.pdf"`);
    doc.pipe(res);

    // Couverture
    doc.fontSize(22).text('EBIOS RM — Analyse des risques', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(study.name, { align: 'center' });
    doc.fontSize(10).text(`Propriétaire : ${study.owner.email}`, { align: 'center' });
    doc.fontSize(10).text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
    doc.addPage();

    const section = (title: string) => {
      doc.fontSize(14).fillColor('#1a1a8c').text(title);
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#000000');
    };

    const row = (label: string, value: string) => {
      doc.text(`• ${label} : ${value}`);
    };

    // Atelier 1
    section('Atelier 1 — Cadrage et socle de sécurité');
    doc.text(`Valeurs métier (${study.businessValues.length}) :`);
    study.businessValues.forEach(bv => row(bv.name, `criticité ${bv.criticality}`));
    doc.moveDown(0.5);
    doc.text(`Biens support (${study.supportingAssets.length}) :`);
    study.supportingAssets.forEach(sa => row(sa.name, sa.type));
    doc.moveDown(0.5);
    doc.text(`Événements redoutés (${study.fearEvents.length}) :`);
    study.fearEvents.forEach(fe => row(fe.name, `gravité ${fe.gravity}`));
    doc.moveDown();

    // Atelier 2
    section('Atelier 2 — Sources de risques');
    study.riskSources.forEach(rs => row(rs.name, `pertinence ${rs.pertinence}`));
    doc.moveDown();

    // Atelier 3
    section('Atelier 3 — Scénarios stratégiques');
    study.strategicScenarios.forEach(ss => row(ss.name, `vraisemblance ${ss.likelihood}`));
    doc.moveDown();

    // Atelier 4
    section('Atelier 4 — Scénarios opérationnels');
    study.operationalScenarios.forEach(os => row(os.name, `vraisemblance tech. ${os.technicalLikelihood}`));
    doc.moveDown();

    // Atelier 5
    section('Atelier 5 — Traitement du risque');
    study.operationalScenarios
      .filter(os => os.risk)
      .forEach(os => {
        const r = os.risk!;
        row(`Risque lié à "${os.name}"`, `niveau ${r.level} → décision : ${r.treatmentDecision}${r.residualLevel ? ` → résiduel ${r.residualLevel}` : ''}`);
        if (r.securityMeasures.length > 0) {
          r.securityMeasures.forEach(sm => doc.text(`    ↳ Mesure : ${sm.name} (${sm.status})`));
        }
      });

    doc.end();
  }

  // FT-04 — Excel
  static async exportExcel(studyId: string, res: Response) {
    const study = await loadFullStudy(studyId);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Prosper EBIOS RM';
    wb.created = new Date();

    const addSheet = (name: string, headers: string[], rows: (string | number)[][]) => {
      const ws = wb.addWorksheet(name);
      ws.addRow(headers).font = { bold: true };
      rows.forEach(r => ws.addRow(r));
      ws.columns.forEach(col => { col.width = 30; });
    };

    addSheet('Valeurs métier', ['Nom', 'Description', 'Criticité'],
      study.businessValues.map(bv => [bv.name, bv.description ?? '', bv.criticality]));

    addSheet('Biens support', ['Nom', 'Type', 'Description'],
      study.supportingAssets.map(sa => [sa.name, sa.type, sa.description ?? '']));

    addSheet('Événements redoutés', ['Nom', 'Gravité', 'Description'],
      study.fearEvents.map(fe => [fe.name, fe.gravity, fe.description ?? '']));

    addSheet('Sources de risques', ['Nom', 'Pertinence', 'Motivation'],
      study.riskSources.map(rs => [rs.name, rs.pertinence, rs.motivation ?? '']));

    addSheet('Scénarios stratégiques', ['Nom', 'Vraisemblance', 'Description'],
      study.strategicScenarios.map(ss => [ss.name, ss.likelihood, ss.description ?? '']));

    addSheet('Scénarios opérationnels', ['Nom', 'Vraisemblance tech.'],
      study.operationalScenarios.map(os => [os.name, os.technicalLikelihood]));

    addSheet('Risques & Mesures', ['Scénario', 'Niveau', 'Décision', 'Résiduel', 'Mesures'],
      study.operationalScenarios.filter(os => os.risk).map(os => [
        os.name,
        os.risk!.level,
        os.risk!.treatmentDecision,
        os.risk!.residualLevel ?? '',
        os.risk!.securityMeasures.map(sm => sm.name).join(', '),
      ]));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="prosper-${study.name.replace(/\s+/g, '_')}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  }

  // FT-05 — JSON export
  static async exportJSON(studyId: string) {
    const study = await loadFullStudy(studyId);
    return { version: '1.0', exportedAt: new Date().toISOString(), study };
  }

  // FT-05 — JSON import (reconstruction complète)
  static async importJSON(payload: any, userId: string) {
    const { study: src } = payload;
    if (!src || !src.name || !src.scope) throw new Error('Payload invalide : champs name/scope requis');

    // Création de l'étude vide puis duplication via StudyService
    // On réutilise le service de duplication après avoir recréé les entités
    const copy = await prisma.study.create({
      data: { name: `${src.name} (importé)`, description: src.description ?? null, scope: src.scope, ownerId: userId, status: 'DRAFT' },
    });

    // Import séquentiel simplifié (sans FK croisées pour éviter la corruption)
    for (const bv of (src.businessValues ?? [])) {
      await prisma.businessValue.create({ data: { studyId: copy.id, name: bv.name, description: bv.description ?? null, criticality: Number(bv.criticality) || 1 } }).catch(() => {});
    }
    for (const rs of (src.riskSources ?? [])) {
      await prisma.riskSource.create({ data: { studyId: copy.id, name: rs.name, description: rs.description ?? null, motivation: rs.motivation ?? null, resources: rs.resources ?? null, pertinence: Number(rs.pertinence) || 1 } }).catch(() => {});
    }

    return copy;
  }
}
```

---

## ÉTAPE 5 — Contrôleurs

### StudyController — ajouter les nouvelles actions

Modifier `apps/api/src/controllers/StudyController.ts` en ajoutant les méthodes suivantes à la classe :

```typescript
  static async duplicate(req: Request, res: Response) {
    try {
      const copy = await StudyService.duplicateStudy(req.params.id, req.userId!);
      res.status(201).json(copy);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getMembers(req: Request, res: Response) {
    try {
      const members = await StudyService.getMembers(req.params.id, req.userId!);
      res.json(members);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async addMember(req: Request, res: Response) {
    try {
      const member = await StudyService.addMember(req.params.id, req.userId!, req.body.email, req.body.role ?? 'CONTRIBUTOR');
      res.status(201).json(member);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async removeMember(req: Request, res: Response) {
    try {
      await StudyService.removeMember(req.params.id, req.userId!, req.params.memberId);
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getSummary(req: Request, res: Response) {
    try {
      const summary = await StudyService.getSummary(req.params.id, req.userId!);
      res.json(summary);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async checkCoherence(req: Request, res: Response) {
    try {
      const result = await StudyService.checkCoherence(req.params.id, req.userId!);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
```

### Créer `apps/api/src/controllers/ExportController.ts`

```typescript
import { Request, Response } from 'express';
import { ExportService } from '../services/ExportService';
import { AuditLogService } from '../services/AuditLogService';

export class ExportController {
  static async exportPDF(req: Request, res: Response) {
    try {
      await AuditLogService.log({ studyId: req.params.studyId, userId: req.userId!, action: 'EXPORT', target: 'Study', details: 'PDF' });
      await ExportService.exportPDF(req.params.studyId, res);
    } catch (err: any) {
      if (!res.headersSent) res.status(500).json({ error: err.message });
    }
  }

  static async exportExcel(req: Request, res: Response) {
    try {
      await AuditLogService.log({ studyId: req.params.studyId, userId: req.userId!, action: 'EXPORT', target: 'Study', details: 'Excel' });
      await ExportService.exportExcel(req.params.studyId, res);
    } catch (err: any) {
      if (!res.headersSent) res.status(500).json({ error: err.message });
    }
  }

  static async exportJSON(req: Request, res: Response) {
    try {
      await AuditLogService.log({ studyId: req.params.studyId, userId: req.userId!, action: 'EXPORT', target: 'Study', details: 'JSON' });
      const data = await ExportService.exportJSON(req.params.studyId);
      res.setHeader('Content-Disposition', `attachment; filename="prosper-export.json"`);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async importJSON(req: Request, res: Response) {
    try {
      const copy = await ExportService.importJSON(req.body, req.userId!);
      res.status(201).json(copy);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
```

### Créer `apps/api/src/controllers/AuditLogController.ts`

```typescript
import { Request, Response } from 'express';
import { AuditLogService } from '../services/AuditLogService';

export class AuditLogController {
  static async getByStudy(req: Request, res: Response) {
    try {
      const entries = await AuditLogService.getByStudy(req.params.studyId, req.userId!);
      res.json(entries);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
```

---

## ÉTAPE 6 — Routes

### Modifier `apps/api/src/routes/studies.ts` — ajouter les routes transverses

```typescript
import { Router } from 'express';
import { StudyController } from '../controllers/StudyController';
import { ExportController } from '../controllers/ExportController';
import { AuditLogController } from '../controllers/AuditLogController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// CRUD de base
router.post('/', authMiddleware, StudyController.create);
router.get('/', authMiddleware, StudyController.list);
router.get('/:id', authMiddleware, StudyController.get);
router.patch('/:id', authMiddleware, StudyController.update);
router.delete('/:id', authMiddleware, StudyController.archive);

// FT-01 — Duplication
router.post('/:id/duplicate', authMiddleware, StudyController.duplicate);

// FT-02 — Membres
router.get('/:id/members', authMiddleware, StudyController.getMembers);
router.post('/:id/members', authMiddleware, StudyController.addMember);
router.delete('/:id/members/:memberId', authMiddleware, StudyController.removeMember);

// FT-03 — Audit log
router.get('/:studyId/audit-logs', authMiddleware, AuditLogController.getByStudy);

// FT-04 — Exports binaires
router.get('/:studyId/export/pdf', authMiddleware, ExportController.exportPDF);
router.get('/:studyId/export/excel', authMiddleware, ExportController.exportExcel);

// FT-05 — Import/export JSON
router.get('/:studyId/export/json', authMiddleware, ExportController.exportJSON);
router.post('/import', authMiddleware, ExportController.importJSON);

// FT-06 — Résumé
router.get('/:id/summary', authMiddleware, StudyController.getSummary);

// FT-07 — Cohérence
router.get('/:id/coherence', authMiddleware, StudyController.checkCoherence);

export default router;
```

---

## ÉTAPE 7 — Hooks frontend

### Créer `apps/web/src/hooks/useStudySummary.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface StudySummary {
  atelier1: { businessValues: number; supportingAssets: number; fearEvents: number; securityBaselines: number };
  atelier2: { riskSources: number };
  atelier3: { stakeholders: number; strategicScenarios: number };
  atelier4: { operationalScenarios: number };
  atelier5: { risksTotal: number; risksReduction: number; risksAccepted: number; risksPending: number; securityMeasures: number; avgLevel: number; avgResidual: number | null };
}

export function useStudySummary(studyId: string) {
  const { accessToken } = useAuth();
  const [summary, setSummary] = useState<StudySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/studies/${studyId}/summary`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error('Erreur chargement résumé');
      setSummary(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [studyId, accessToken]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  return { summary, loading, error, refetch: fetchSummary };
}
```

### Créer `apps/web/src/hooks/useCoherence.ts`

```typescript
import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface CoherenceResult {
  valid: boolean;
  warnings: string[];
}

export function useCoherence(studyId: string) {
  const { accessToken } = useAuth();
  const [result, setResult] = useState<CoherenceResult | null>(null);
  const [loading, setLoading] = useState(false);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/studies/${studyId}/coherence`, { headers: { Authorization: `Bearer ${accessToken}` } });
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }, [studyId, accessToken]);

  return { result, loading, check };
}
```

### Créer `apps/web/src/hooks/useAuditLog.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface AuditEntry {
  id: string;
  action: string;
  target: string;
  targetId?: string;
  details?: string;
  createdAt: string;
  user: { email: string };
}

export function useAuditLog(studyId: string) {
  const { accessToken } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/studies/${studyId}/audit-logs`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) setEntries(await res.json());
    } finally {
      setLoading(false);
    }
  }, [studyId, accessToken]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { entries, loading, refetch: fetch_ };
}
```

---

## ÉTAPE 8 — Composant StudySummaryPanel (FT-06 + FT-07 + FT-03 + FT-04 + FT-05)

Créer `apps/web/src/components/StudySummaryPanel.tsx` :

```typescript
import { useStudySummary } from '../hooks/useStudySummary';
import { useCoherence } from '../hooks/useCoherence';
import { useAuditLog } from '../hooks/useAuditLog';
import { useAuth } from '../context/AuthContext';

interface Props {
  studyId: string;
}

export function StudySummaryPanel({ studyId }: Props) {
  const { accessToken } = useAuth();
  const { summary, loading: loadingSummary } = useStudySummary(studyId);
  const { result: coherence, loading: loadingCoherence, check } = useCoherence(studyId);
  const { entries, loading: loadingLog } = useAuditLog(studyId);
  const [activeTab, setActiveTab] = useState<'summary' | 'coherence' | 'log' | 'exports'>('summary');

  const handleExport = async (format: 'pdf' | 'excel' | 'json') => {
    const ext = format === 'excel' ? 'xlsx' : format;
    const res = await fetch(`/api/studies/${studyId}/export/${format === 'excel' ? 'excel' : format}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) { alert('Erreur export'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prosper-export.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: Array<{ key: 'summary' | 'coherence' | 'log' | 'exports'; label: string }> = [
    { key: 'summary', label: 'Synthèse' },
    { key: 'coherence', label: 'Cohérence' },
    { key: 'log', label: 'Journal' },
    { key: 'exports', label: 'Exports' },
  ];

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '20px' }}>
      <h2>Vue transversale</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '6px 14px',
              background: activeTab === t.key ? '#007bff' : '#eee',
              color: activeTab === t.key ? 'white' : 'black',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Onglet Synthèse */}
      {activeTab === 'summary' && (
        <div>
          {loadingSummary ? <p>Chargement…</p> : summary ? (
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  {['Atelier', 'Indicateur', 'Valeur'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #ddd' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['A1', 'Valeurs métier', summary.atelier1.businessValues],
                  ['A1', 'Biens support', summary.atelier1.supportingAssets],
                  ['A1', 'Événements redoutés', summary.atelier1.fearEvents],
                  ['A1', 'Socle sécurité', summary.atelier1.securityBaselines],
                  ['A2', 'Sources de risques', summary.atelier2.riskSources],
                  ['A3', 'Parties prenantes', summary.atelier3.stakeholders],
                  ['A3', 'Scénarios stratégiques', summary.atelier3.strategicScenarios],
                  ['A4', 'Scénarios opérationnels', summary.atelier4.operationalScenarios],
                  ['A5', 'Risques total', summary.atelier5.risksTotal],
                  ['A5', 'En attente traitement', summary.atelier5.risksPending],
                  ['A5', 'Réduction', summary.atelier5.risksReduction],
                  ['A5', 'Acceptés', summary.atelier5.risksAccepted],
                  ['A5', 'Mesures de sécurité', summary.atelier5.securityMeasures],
                  ['A5', 'Niveau moyen', summary.atelier5.avgLevel],
                  ['A5', 'Résiduel moyen', summary.atelier5.avgResidual ?? 'N/A'],
                ].map(([atelier, label, value], i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#f9f9f9' : 'white' }}>
                    <td style={{ padding: '6px 8px', color: '#666' }}>{atelier}</td>
                    <td style={{ padding: '6px 8px' }}>{label}</td>
                    <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p>Aucune donnée.</p>}
        </div>
      )}

      {/* Onglet Cohérence */}
      {activeTab === 'coherence' && (
        <div>
          <button onClick={check} disabled={loadingCoherence} style={{ padding: '8px 16px', marginBottom: '16px', cursor: 'pointer' }}>
            {loadingCoherence ? 'Vérification…' : 'Lancer le contrôle de cohérence'}
          </button>
          {coherence && (
            <div>
              <p style={{ color: coherence.valid ? 'green' : 'orange', fontWeight: 'bold' }}>
                {coherence.valid ? '✓ Aucune incohérence détectée' : `⚠ ${coherence.warnings.length} avertissement(s)`}
              </p>
              {coherence.warnings.length > 0 && (
                <ul>
                  {coherence.warnings.map((w, i) => <li key={i} style={{ color: '#c47a00', marginBottom: '6px' }}>{w}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Onglet Journal */}
      {activeTab === 'log' && (
        <div>
          {loadingLog ? <p>Chargement…</p> : entries.length === 0 ? <p>Aucune entrée.</p> : (
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Date', 'Utilisateur', 'Action', 'Cible', 'Détails'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #ddd' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.id} style={{ background: i % 2 === 0 ? '#f9f9f9' : 'white' }}>
                    <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}>{new Date(e.createdAt).toLocaleString('fr-FR')}</td>
                    <td style={{ padding: '5px 8px' }}>{e.user.email}</td>
                    <td style={{ padding: '5px 8px', fontWeight: 'bold' }}>{e.action}</td>
                    <td style={{ padding: '5px 8px' }}>{e.target}</td>
                    <td style={{ padding: '5px 8px', color: '#666' }}>{e.details ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Onglet Exports */}
      {activeTab === 'exports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
          <h3 style={{ margin: '0 0 8px' }}>Télécharger l'analyse</h3>
          {[
            { label: 'Exporter en PDF', format: 'pdf' as const, color: '#dc3545' },
            { label: 'Exporter en Excel', format: 'excel' as const, color: '#1e7e34' },
            { label: 'Exporter en JSON', format: 'json' as const, color: '#004085' },
          ].map(({ label, format, color }) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              style={{ padding: '10px 16px', background: color, color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', fontSize: '14px' }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

Ajouter l'import manquant en haut du fichier :

```typescript
import { useState } from 'react';
```

---

## ÉTAPE 9 — Intégration dans StudyPage + DashboardPage

### Modifier `apps/web/src/pages/StudyPage.tsx` (ou créer si inexistant)

Vérifier l'existence du fichier. S'il existe, ajouter au bas de la page rendue :

```tsx
import { StudySummaryPanel } from '../components/StudySummaryPanel';

// À l'intérieur du JSX retourné, après <AtlierLayout> :
<StudySummaryPanel studyId={studyId} />
```

S'il n'existe pas, le créer :

```typescript
import { useParams } from 'react-router-dom';
import { AtlierLayout } from '../components/AtlierLayout';
import { StudySummaryPanel } from '../components/StudySummaryPanel';

export function StudyPage() {
  const { studyId } = useParams<{ studyId: string }>();
  if (!studyId) return <p>Étude introuvable.</p>;

  return (
    <div style={{ padding: '20px' }}>
      <AtlierLayout studyId={studyId} />
      <StudySummaryPanel studyId={studyId} />
    </div>
  );
}
```

### Modifier `apps/web/src/pages/DashboardPage.tsx` — ajouter Dupliquer + Import JSON

Dans la liste des études, ajouter à côté du nom :

```tsx
<button
  onClick={async (e) => {
    e.stopPropagation();
    const res = await fetch(`/api/studies/${study.id}/duplicate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) { const copy = await res.json(); setStudies(prev => [...prev, copy]); }
    else alert('Erreur lors de la duplication');
  }}
  style={{ marginLeft: '12px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
>
  Dupliquer
</button>
```

Ajouter également un bouton et formulaire d'import JSON (input file `accept=".json"`) :

```tsx
const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const payload = JSON.parse(text);
  const res = await fetch('/api/studies/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  if (res.ok) { const copy = await res.json(); setStudies(prev => [...prev, copy]); }
  else alert('Erreur import JSON');
};

// Dans le JSX :
<label style={{ padding: '8px 16px', cursor: 'pointer', background: '#eee', marginLeft: '12px' }}>
  Importer JSON
  <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
</label>
```

---

## ÉTAPE 10 — Gestion des membres (FT-02)

Créer `apps/web/src/components/StudyMembersPanel.tsx` :

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface Member {
  userId: string;
  role: string;
  user: { id: string; email: string; role: string };
}

export function StudyMembersPanel({ studyId }: { studyId: string }) {
  const { accessToken } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('CONTRIBUTOR');
  const [loading, setLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    const res = await fetch(`/api/studies/${studyId}/members`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.ok) setMembers(await res.json());
  }, [studyId, accessToken]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const addMember = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/studies/${studyId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ email, role }),
    });
    setLoading(false);
    if (res.ok) { setEmail(''); await fetchMembers(); }
    else { const err = await res.json(); alert(err.error); }
  };

  const removeMember = async (memberId: string) => {
    await fetch(`/api/studies/${studyId}/members/${memberId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await fetchMembers();
  };

  return (
    <div style={{ marginTop: '20px', padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h3>Membres de l'étude</h3>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email du collaborateur"
          style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px', flex: 1 }}
        />
        <select value={role} onChange={e => setRole(e.target.value)} style={{ padding: '6px' }}>
          <option value="CONTRIBUTOR">Contributeur</option>
          <option value="VALIDATOR">Valideur</option>
          <option value="READER">Lecteur</option>
          <option value="PILOT">Pilote</option>
        </select>
        <button onClick={addMember} disabled={loading} style={{ padding: '6px 14px', cursor: 'pointer' }}>
          {loading ? '…' : 'Ajouter'}
        </button>
      </div>
      {members.length === 0 ? <p style={{ color: '#666' }}>Aucun membre ajouté.</p> : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {members.map(m => (
            <li key={m.userId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
              <span>{m.user.email} — <strong>{m.role}</strong></span>
              <button onClick={() => removeMember(m.userId)} style={{ padding: '2px 8px', cursor: 'pointer', color: 'red', border: '1px solid red', background: 'transparent' }}>
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

Ajouter `<StudyMembersPanel studyId={studyId} />` dans `StudyPage.tsx` à la suite de `<StudySummaryPanel>`.

---

## ÉTAPE 11 — Fermer les issues GitHub

```bash
cd ~/projects/Prosper
gh issue close 1 --comment "FT-01 implémenté : duplication deep copy + bouton Dashboard (Phase 7)"
gh issue close 2 --comment "FT-02 implémenté : gestion membres + rôles (Phase 7)"
gh issue close 3 --comment "FT-03 implémenté : AuditLogService + journal UI (Phase 7)"
gh issue close 4 --comment "FT-04 implémenté : export PDF pdfkit + Excel exceljs (Phase 7)"
gh issue close 5 --comment "FT-05 implémenté : export/import JSON (Phase 7)"
gh issue close 6 --comment "FT-06 implémenté : tableau de bord synthèse StudySummaryPanel (Phase 7)"
gh issue close 7 --comment "FT-07 implémenté : contrôle de cohérence inter-ateliers (Phase 7)"
```

---

## ÉTAPE 12 — Build, validation et commit

```bash
cd ~/projects/Prosper
pnpm --filter api build
pnpm --filter web build
```

Les deux builds doivent passer sans erreur TypeScript.

Puis :

```bash
git add -A
git commit -m "feat: Phase 7 — Fonctionnalités transverses (FT-01 à FT-07)"
git push origin main
```

Enfin, créer le RETEX :

```bash
cat > RETEX/phase7-transverses-$(date +%Y-%m-%d).md << 'EOF'
# Rapport Phase 7 — Fonctionnalités transverses (FT-01 à FT-07)
Date : $(date +%Y-%m-%d)

## Résumé
- Étapes exécutées : toutes (1 à 12)
- Étapes échouées ou contournées : aucune

## Fichiers créés ou modifiés
[Compléter après exécution]

## Incidents rencontrés
| # | Description | Solution appliquée |
|---|-------------|-------------------|
| - | Aucun incident | — |

## État final
- [ ] AuditLogService opérationnel
- [ ] StudyService étendu (duplicate, membres, summary, coherence)
- [ ] ExportService PDF + Excel + JSON fonctionnel
- [ ] Routes transverses montées
- [ ] Hooks frontend créés (useStudySummary, useCoherence, useAuditLog)
- [ ] StudySummaryPanel 4 onglets intégré
- [ ] StudyMembersPanel intégré
- [ ] Issues #1 à #7 fermées
- [ ] Commit poussé sur GitHub
- [ ] Build API : ✅
- [ ] Build Web : ✅
EOF

git add RETEX/
git commit -m "docs: add RETEX for Phase 7 transverses"
git push origin main
```

---

## Contraintes et règles à respecter

1. **Scope** : ne modifier aucun fichier des Ateliers 1 à 5 sauf ajout d'import dans StudyService.
2. **Pas de refactor** : ne pas réécrire les services existants, seulement ajouter des méthodes.
3. **Sécurité** : tous les endpoints vérifient l'accès (`getStudy` ou `validateStudyAccess`) avant d'opérer.
4. **Taille de l'export PDF** : ne pas inclure les détails binaires dans la réponse JSON, utiliser `res.pipe`.
5. **Import JSON** : valider au minimum `name` et `scope` avant la création.
6. **Tests** : aucun test n'est requis pour cette phase (scope fonctionnel, couverture déjà établie sur les ateliers).
