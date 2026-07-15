import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const CreateStakeholderSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  dependencyLevel: z.number().int().min(1).max(4),
  threatLevel: z.number().int().min(1).max(4),
});

export class StakeholderService {
  static async create(studyId: string, data: z.infer<typeof CreateStakeholderSchema>, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    const validated = CreateStakeholderSchema.parse(data);
    return prisma.stakeholder.create({ data: { ...validated, studyId } });
  }

  static async getAll(studyId: string, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    return prisma.stakeholder.findMany({ where: { studyId } });
  }

  static async update(id: string, data: Partial<z.infer<typeof CreateStakeholderSchema>>, userId: string) {
    const sh = await prisma.stakeholder.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(sh.studyId, userId);
    return prisma.stakeholder.update({ where: { id }, data });
  }

  static async delete(id: string, userId: string) {
    const sh = await prisma.stakeholder.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(sh.studyId, userId);
    return prisma.stakeholder.delete({ where: { id } });
  }

  private static async validateStudyAccess(studyId: string, userId: string) {
    const study = await prisma.study.findUniqueOrThrow({ where: { id: studyId } });
    if (study.ownerId !== userId) {
      const su = await prisma.studyUser.findFirst({ where: { studyId, userId } });
      if (!su) throw new Error('Not authorized');
    }
  }
}
