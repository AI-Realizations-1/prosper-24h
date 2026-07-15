import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const CreateStrategicScenarioSchema = z.object({
  pairId: z.string().min(1),
  fearEventId: z.string().min(1),
  likelihood: z.number().int().min(1).max(4),
  stakeholderIds: z.array(z.string()).optional(),
});

const UpdateLikelihoodSchema = z.object({
  likelihood: z.number().int().min(1).max(4),
});

export class StrategicScenarioService {
  static async create(studyId: string, data: z.infer<typeof CreateStrategicScenarioSchema>, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    const validated = CreateStrategicScenarioSchema.parse(data);
    const { stakeholderIds, ...rest } = validated;

    const scenario = await prisma.strategicScenario.create({
      data: { ...rest, studyId },
      include: {
        pair: { include: { riskSource: true, targetObjective: true } },
        fearEvent: true,
        stakeholders: { include: { stakeholder: true } },
      },
    });

    if (stakeholderIds?.length) {
      await Promise.all(
        stakeholderIds.map((shId) =>
          prisma.strategicScenarioStakeholder.create({
            data: { scenarioId: scenario.id, stakeholderId: shId },
          })
        )
      );
      return prisma.strategicScenario.findUniqueOrThrow({
        where: { id: scenario.id },
        include: {
          pair: { include: { riskSource: true, targetObjective: true } },
          fearEvent: true,
          stakeholders: { include: { stakeholder: true } },
        },
      });
    }

    return scenario;
  }

  static async getAll(studyId: string, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    return prisma.strategicScenario.findMany({
      where: { studyId },
      include: {
        pair: { include: { riskSource: true, targetObjective: true } },
        fearEvent: true,
        stakeholders: { include: { stakeholder: true } },
      },
    });
  }

  static async updateLikelihood(id: string, data: z.infer<typeof UpdateLikelihoodSchema>, userId: string) {
    const ss = await prisma.strategicScenario.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(ss.studyId, userId);
    const validated = UpdateLikelihoodSchema.parse(data);
    return prisma.strategicScenario.update({ where: { id }, data: validated });
  }

  static async addStakeholder(scenarioId: string, stakeholderId: string, userId: string) {
    const ss = await prisma.strategicScenario.findUniqueOrThrow({ where: { id: scenarioId } });
    await this.validateStudyAccess(ss.studyId, userId);
    await prisma.strategicScenarioStakeholder.create({
      data: { scenarioId, stakeholderId },
    });
    return prisma.strategicScenario.findUniqueOrThrow({
      where: { id: scenarioId },
      include: { stakeholders: { include: { stakeholder: true } } },
    });
  }

  static async removeStakeholder(scenarioId: string, stakeholderId: string, userId: string) {
    const ss = await prisma.strategicScenario.findUniqueOrThrow({ where: { id: scenarioId } });
    await this.validateStudyAccess(ss.studyId, userId);
    await prisma.strategicScenarioStakeholder.delete({
      where: { scenarioId_stakeholderId: { scenarioId, stakeholderId } },
    });
    return prisma.strategicScenario.findUniqueOrThrow({
      where: { id: scenarioId },
      include: { stakeholders: { include: { stakeholder: true } } },
    });
  }

  static async delete(id: string, userId: string) {
    const ss = await prisma.strategicScenario.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(ss.studyId, userId);
    return prisma.strategicScenario.delete({ where: { id } });
  }

  private static async validateStudyAccess(studyId: string, userId: string) {
    const study = await prisma.study.findUniqueOrThrow({ where: { id: studyId } });
    if (study.ownerId !== userId) {
      const su = await prisma.studyUser.findFirst({ where: { studyId, userId } });
      if (!su) throw new Error('Not authorized');
    }
  }
}
