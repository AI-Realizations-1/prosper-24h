import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuditLogService } from './AuditLogService';

const prisma = new PrismaClient();

const CreateStudySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  scope: z.string().min(1),
});

export class StudyService {
  static async createStudy(data: z.infer<typeof CreateStudySchema>, ownerId: string) {
    const validated = CreateStudySchema.parse(data);
    return prisma.study.create({
      data: { ...validated, ownerId },
      include: { owner: true },
    });
  }

  static async getStudy(studyId: string, userId: string) {
    const study = await prisma.study.findUniqueOrThrow({
      where: { id: studyId },
      include: {
        owner: true,
        businessValues: true,
        supportingAssets: true,
        fearEvents: true,
        securityBaselines: true,
        studyUsers: true,
      },
    });

    if (study.ownerId !== userId) {
      const studyUser = await prisma.studyUser.findFirst({
        where: { studyId, userId },
      });
      if (!studyUser) throw new Error('Not authorized');
    }

    return study;
  }

  static async listStudies(userId: string) {
    return prisma.study.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { studyUsers: { some: { userId } } },
        ],
      },
      include: { owner: true },
    });
  }

  static async updateStudy(studyId: string, data: Partial<z.infer<typeof CreateStudySchema>>, userId: string) {
    const study = await this.getStudy(studyId, userId);
    if (study.ownerId !== userId) throw new Error('Only owner can update');

    return prisma.study.update({
      where: { id: studyId },
      data,
    });
  }

  static async archiveStudy(studyId: string, userId: string) {
    const study = await this.getStudy(studyId, userId);
    if (study.ownerId !== userId) throw new Error('Only owner can archive');

    return prisma.study.update({
      where: { id: studyId },
      data: { status: 'ARCHIVED' },
    });
  }

  // ─── FT-01 : Duplication ───────────────────────────────────────────
  static async duplicateStudy(studyId: string, userId: string) {
    const src = await prisma.study.findUniqueOrThrow({
      where: { id: studyId },
      include: {
        businessValues: true,
        supportingAssets: {
          include: { businessValues: { select: { id: true } } },
        },
        fearEvents: {
          include: { supportingAssets: { select: { id: true } } },
        },
        securityBaselines: true,
        riskSources: true,
        targetObjectives: true,
        riskSourceObjectivePairs: true,
        stakeholders: true,
        strategicScenarios: {
          include: { stakeholders: { select: { stakeholderId: true } } },
        },
        operationalScenarios: {
          include: {
            supportingAssets: { select: { supportingAssetId: true } },
            risk: { include: { securityMeasures: true } },
          },
        },
      },
    });

    if (src.ownerId !== userId) throw new Error('Only owner can duplicate');

    const newStudy = await prisma.study.create({
      data: {
        name: `Copie de ${src.name}`,
        description: src.description ?? undefined,
        scope: src.scope,
        ownerId: userId,
        status: 'DRAFT',
      },
    });
    const newId = newStudy.id;

    // BusinessValues
    const bvMap = new Map<string, string>();
    for (const bv of src.businessValues) {
      const n = await prisma.businessValue.create({
        data: { studyId: newId, name: bv.name, description: bv.description ?? undefined },
      });
      bvMap.set(bv.id, n.id);
    }

    // SupportingAssets (M-N with BusinessValues)
    const saMap = new Map<string, string>();
    for (const sa of src.supportingAssets) {
      const n = await prisma.supportingAsset.create({
        data: {
          studyId: newId,
          name: sa.name,
          type: sa.type,
          businessValues: {
            connect: sa.businessValues
              .map((bv) => bvMap.get(bv.id))
              .filter(Boolean)
              .map((id) => ({ id: id! })),
          },
        },
      });
      saMap.set(sa.id, n.id);
    }

    // FearEvents (M-1 with BusinessValue, M-N with SupportingAssets)
    const feMap = new Map<string, string>();
    for (const fe of src.fearEvents) {
      const newBvId = bvMap.get(fe.businessValueId);
      if (!newBvId) continue;
      const n = await prisma.fearEvent.create({
        data: {
          studyId: newId,
          businessValueId: newBvId,
          description: fe.description,
          gravity: fe.gravity,
          supportingAssets: {
            connect: fe.supportingAssets
              .map((sa) => saMap.get(sa.id))
              .filter(Boolean)
              .map((id) => ({ id: id! })),
          },
        },
      });
      feMap.set(fe.id, n.id);
    }

    // SecurityBaselines
    for (const sb of src.securityBaselines) {
      await prisma.securityBaseline.create({
        data: { studyId: newId, referential: sb.referential, compliance: sb.compliance, gap: sb.gap ?? undefined },
      });
    }

    // RiskSources
    const rsMap = new Map<string, string>();
    for (const rs of src.riskSources) {
      const n = await prisma.riskSource.create({
        data: { studyId: newId, name: rs.name, category: rs.category, description: rs.description ?? undefined },
      });
      rsMap.set(rs.id, n.id);
    }

    // TargetObjectives
    const toMap = new Map<string, string>();
    for (const to of src.targetObjectives) {
      const n = await prisma.targetObjective.create({
        data: { studyId: newId, description: to.description },
      });
      toMap.set(to.id, n.id);
    }

    // RiskSourceObjectivePairs
    const pairMap = new Map<string, string>();
    for (const pair of src.riskSourceObjectivePairs) {
      const newRsId = rsMap.get(pair.riskSourceId);
      const newToId = toMap.get(pair.targetObjectiveId);
      if (!newRsId || !newToId) continue;
      const n = await prisma.riskSourceObjectivePair.create({
        data: {
          studyId: newId,
          riskSourceId: newRsId,
          targetObjectiveId: newToId,
          relevance: pair.relevance,
          justification: pair.justification ?? undefined,
        },
      });
      pairMap.set(pair.id, n.id);
    }

    // Stakeholders
    const stMap = new Map<string, string>();
    for (const st of src.stakeholders) {
      const n = await prisma.stakeholder.create({
        data: {
          studyId: newId,
          name: st.name,
          category: st.category,
          dependencyLevel: st.dependencyLevel,
          threatLevel: st.threatLevel,
        },
      });
      stMap.set(st.id, n.id);
    }

    // StrategicScenarios
    const ssMap = new Map<string, string>();
    for (const ss of src.strategicScenarios) {
      const newPairId = pairMap.get(ss.pairId);
      const newFeId = feMap.get(ss.fearEventId);
      if (!newPairId || !newFeId) continue;
      const n = await prisma.strategicScenario.create({
        data: { studyId: newId, pairId: newPairId, fearEventId: newFeId, likelihood: ss.likelihood },
      });
      ssMap.set(ss.id, n.id);
      // Junction stakeholders
      for (const link of ss.stakeholders) {
        const newStId = stMap.get(link.stakeholderId);
        if (!newStId) continue;
        await prisma.strategicScenarioStakeholder.create({
          data: { scenarioId: n.id, stakeholderId: newStId },
        });
      }
    }

    // OperationalScenarios
    const osMap = new Map<string, string>();
    for (const os of src.operationalScenarios) {
      const newSsId = ssMap.get(os.strategicScenarioId);
      if (!newSsId) continue;
      const n = await prisma.operationalScenario.create({
        data: {
          studyId: newId,
          strategicScenarioId: newSsId,
          description: os.description ?? undefined,
          technicalLikelihood: os.technicalLikelihood,
        },
      });
      osMap.set(os.id, n.id);
      // Junction supportingAssets
      for (const link of os.supportingAssets) {
        const newSaId = saMap.get(link.supportingAssetId);
        if (!newSaId) continue;
        await prisma.operationalScenarioSupportingAsset.create({
          data: { operationalScenarioId: n.id, supportingAssetId: newSaId },
        });
      }
      // Risk + SecurityMeasures
      if (os.risk) {
        const newRisk = await prisma.risk.create({
          data: {
            studyId: newId,
            operationalScenarioId: n.id,
            level: os.risk.level,
            treatmentDecision: os.risk.treatmentDecision,
            residualLevel: os.risk.residualLevel ?? undefined,
            justification: os.risk.justification ?? undefined,
          },
        });
        for (const sm of os.risk.securityMeasures) {
          await prisma.securityMeasure.create({
            data: {
              studyId: newId,
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

    await AuditLogService.log({
      studyId: newId,
      userId,
      action: 'DUPLICATE',
      target: 'Study',
      targetId: studyId,
      details: `Dupliqué depuis "${src.name}"`,
    });

    return newStudy;
  }

  // ─── FT-02 : Membres ──────────────────────────────────────────────
  static async getMembers(studyId: string, userId: string) {
    await this.getStudy(studyId, userId);
    return prisma.studyUser.findMany({
      where: { studyId },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  static async addMember(studyId: string, ownerId: string, email: string, role: string) {
    const study = await this.getStudy(studyId, ownerId);
    if (study.ownerId !== ownerId) throw new Error('Only owner can add members');

    const target = await prisma.user.findUnique({ where: { email } });
    if (!target) throw new Error('User not found');
    if (target.id === ownerId) throw new Error('Owner is already a member');

    return prisma.studyUser.upsert({
      where: { studyId_userId: { studyId, userId: target.id } },
      create: { studyId, userId: target.id, role: role as any },
      update: { role: role as any },
    });
  }

  static async removeMember(studyId: string, ownerId: string, memberId: string) {
    const study = await this.getStudy(studyId, ownerId);
    if (study.ownerId !== ownerId) throw new Error('Only owner can remove members');

    return prisma.studyUser.deleteMany({ where: { studyId, userId: memberId } });
  }

  // ─── FT-03 : Synthèse ─────────────────────────────────────────────
  static async getSummary(studyId: string, userId: string) {
    await this.getStudy(studyId, userId);

    const [
      bvCount, saCount, feCount, sbCount,
      rsCount, toCount, pairCount,
      stCount, ssCount,
      osCount,
      riskCount, pendingRisks, criticalRisks,
      smCount,
    ] = await Promise.all([
      prisma.businessValue.count({ where: { studyId } }),
      prisma.supportingAsset.count({ where: { studyId } }),
      prisma.fearEvent.count({ where: { studyId } }),
      prisma.securityBaseline.count({ where: { studyId } }),
      prisma.riskSource.count({ where: { studyId } }),
      prisma.targetObjective.count({ where: { studyId } }),
      prisma.riskSourceObjectivePair.count({ where: { studyId } }),
      prisma.stakeholder.count({ where: { studyId } }),
      prisma.strategicScenario.count({ where: { studyId } }),
      prisma.operationalScenario.count({ where: { studyId } }),
      prisma.risk.count({ where: { studyId } }),
      prisma.risk.count({ where: { studyId, treatmentDecision: 'PENDING' } }),
      prisma.risk.count({ where: { studyId, level: { gte: 3 } } }),
      prisma.securityMeasure.count({ where: { studyId } }),
    ]);

    return {
      atelier1: { businessValues: bvCount, supportingAssets: saCount, fearEvents: feCount, securityBaselines: sbCount },
      atelier2: { riskSources: rsCount, targetObjectives: toCount, pairs: pairCount },
      atelier3: { stakeholders: stCount, strategicScenarios: ssCount },
      atelier4: { operationalScenarios: osCount },
      atelier5: { risks: riskCount, pendingRisks, criticalRisks, securityMeasures: smCount },
    };
  }

  // ─── FT-04 : Cohérence ────────────────────────────────────────────
  static async checkCoherence(studyId: string, userId: string) {
    await this.getStudy(studyId, userId);
    const warnings: string[] = [];

    const bvWithoutSA = await prisma.businessValue.findMany({
      where: { studyId, supportingAssets: { none: {} } },
    });
    bvWithoutSA.forEach((bv) => warnings.push(`Valeur métier "${bv.name}" sans bien support associé`));

    const saWithoutFE = await prisma.supportingAsset.findMany({
      where: { studyId, fearEvents: { none: {} } },
    });
    saWithoutFE.forEach((sa) => warnings.push(`Bien support "${sa.name}" sans événement redouté associé`));

    const ssWithoutOS = await prisma.strategicScenario.findMany({
      where: { studyId, operationalScenarios: { none: {} } },
    });
    ssWithoutOS.forEach((ss) => warnings.push(`Scénario stratégique #${ss.id.slice(-6)} sans scénario opérationnel`));

    const osWithoutRisk = await prisma.operationalScenario.findMany({
      where: { studyId, risk: null },
    });
    osWithoutRisk.forEach((os) => warnings.push(`Scénario opérationnel #${os.id.slice(-6)} sans risque évalué`));

    const pendingRisks = await prisma.risk.count({ where: { studyId, treatmentDecision: 'PENDING' } });
    if (pendingRisks > 0) warnings.push(`${pendingRisks} risque(s) en attente de décision de traitement`);

    return { coherent: warnings.length === 0, warnings };
  }

  // ─── FT-05 : Import JSON ──────────────────────────────────────────
  static async importStudy(json: any, userId: string) {
    if (!json?.name || !json?.scope) throw new Error('JSON invalide : champs name et scope requis');
    const newStudy = await prisma.study.create({
      data: {
        name: `[Import] ${json.name}`,
        description: json.description ?? undefined,
        scope: json.scope,
        ownerId: userId,
        status: 'DRAFT',
      },
    });
    await AuditLogService.log({
      studyId: newStudy.id,
      userId,
      action: 'IMPORT',
      target: 'Study',
      targetId: newStudy.id,
      details: `Importé depuis JSON`,
    });
    return newStudy;
  }
}
