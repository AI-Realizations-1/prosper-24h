import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const CreateRiskSourceSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
});

export class RiskSourceService {
  static async create(studyId: string, data: z.infer<typeof CreateRiskSourceSchema>, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    const validated = CreateRiskSourceSchema.parse(data);
    return prisma.riskSource.create({ data: { ...validated, studyId } });
  }

  static async getAll(studyId: string, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    return prisma.riskSource.findMany({ where: { studyId } });
  }

  static async update(id: string, data: Partial<z.infer<typeof CreateRiskSourceSchema>>, userId: string) {
    const rs = await prisma.riskSource.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(rs.studyId, userId);
    return prisma.riskSource.update({ where: { id }, data });
  }

  static async delete(id: string, userId: string) {
    const rs = await prisma.riskSource.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(rs.studyId, userId);
    return prisma.riskSource.delete({ where: { id } });
  }

  private static async validateStudyAccess(studyId: string, userId: string) {
    const study = await prisma.study.findUniqueOrThrow({ where: { id: studyId } });
    if (study.ownerId !== userId) {
      const su = await prisma.studyUser.findFirst({ where: { studyId, userId } });
      if (!su) throw new Error('Not authorized');
    }
  }
}
