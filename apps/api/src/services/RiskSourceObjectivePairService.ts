import { PrismaClient, PairRelevance } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const CreatePairSchema = z.object({
  riskSourceId: z.string().min(1),
  targetObjectiveId: z.string().min(1),
  relevance: z.nativeEnum(PairRelevance).optional(),
  justification: z.string().optional(),
});

const UpdatePairSchema = z.object({
  relevance: z.nativeEnum(PairRelevance),
  justification: z.string().optional(),
});

export class RiskSourceObjectivePairService {
  static async create(studyId: string, data: z.infer<typeof CreatePairSchema>, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    const validated = CreatePairSchema.parse(data);
    return prisma.riskSourceObjectivePair.create({
      data: { ...validated, studyId },
      include: { riskSource: true, targetObjective: true },
    });
  }

  static async getAll(studyId: string, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    return prisma.riskSourceObjectivePair.findMany({
      where: { studyId },
      include: { riskSource: true, targetObjective: true },
    });
  }

  static async getRetained(studyId: string, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    return prisma.riskSourceObjectivePair.findMany({
      where: { studyId, relevance: 'RETAINED' },
      include: { riskSource: true, targetObjective: true },
    });
  }

  static async updateRelevance(id: string, data: z.infer<typeof UpdatePairSchema>, userId: string) {
    const pair = await prisma.riskSourceObjectivePair.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(pair.studyId, userId);
    const validated = UpdatePairSchema.parse(data);
    return prisma.riskSourceObjectivePair.update({ where: { id }, data: validated });
  }

  static async delete(id: string, userId: string) {
    const pair = await prisma.riskSourceObjectivePair.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(pair.studyId, userId);
    return prisma.riskSourceObjectivePair.delete({ where: { id } });
  }

  private static async validateStudyAccess(studyId: string, userId: string) {
    const study = await prisma.study.findUniqueOrThrow({ where: { id: studyId } });
    if (study.ownerId !== userId) {
      const su = await prisma.studyUser.findFirst({ where: { studyId, userId } });
      if (!su) throw new Error('Not authorized');
    }
  }
}
