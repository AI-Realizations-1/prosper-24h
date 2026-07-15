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
