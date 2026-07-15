import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const CreateTargetObjectiveSchema = z.object({
  description: z.string().min(1),
});

export class TargetObjectiveService {
  static async create(studyId: string, data: z.infer<typeof CreateTargetObjectiveSchema>, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    const validated = CreateTargetObjectiveSchema.parse(data);
    return prisma.targetObjective.create({ data: { ...validated, studyId } });
  }

  static async getAll(studyId: string, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    return prisma.targetObjective.findMany({ where: { studyId } });
  }

  static async update(id: string, data: Partial<z.infer<typeof CreateTargetObjectiveSchema>>, userId: string) {
    const to = await prisma.targetObjective.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(to.studyId, userId);
    return prisma.targetObjective.update({ where: { id }, data });
  }

  static async delete(id: string, userId: string) {
    const to = await prisma.targetObjective.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(to.studyId, userId);
    return prisma.targetObjective.delete({ where: { id } });
  }

  private static async validateStudyAccess(studyId: string, userId: string) {
    const study = await prisma.study.findUniqueOrThrow({ where: { id: studyId } });
    if (study.ownerId !== userId) {
      const su = await prisma.studyUser.findFirst({ where: { studyId, userId } });
      if (!su) throw new Error('Not authorized');
    }
  }
}
