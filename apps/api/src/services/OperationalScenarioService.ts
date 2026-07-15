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
