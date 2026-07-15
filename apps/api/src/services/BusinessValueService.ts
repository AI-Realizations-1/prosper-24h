import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const CreateBusinessValueSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export class BusinessValueService {
  static async create(studyId: string, data: z.infer<typeof CreateBusinessValueSchema>, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    const validated = CreateBusinessValueSchema.parse(data);
    return prisma.businessValue.create({
      data: { ...validated, studyId },
    });
  }

  static async getAll(studyId: string, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    return prisma.businessValue.findMany({ where: { studyId } });
  }

  static async update(id: string, data: Partial<z.infer<typeof CreateBusinessValueSchema>>, userId: string) {
    const bv = await prisma.businessValue.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(bv.studyId, userId);
    return prisma.businessValue.update({ where: { id }, data });
  }

  static async delete(id: string, userId: string) {
    const bv = await prisma.businessValue.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(bv.studyId, userId);
    return prisma.businessValue.delete({ where: { id } });
  }

  private static async validateStudyAccess(studyId: string, userId: string) {
    const study = await prisma.study.findUniqueOrThrow({ where: { id: studyId } });
    if (study.ownerId !== userId) {
      const studyUser = await prisma.studyUser.findFirst({ where: { studyId, userId } });
      if (!studyUser) throw new Error('Not authorized');
    }
  }
}
