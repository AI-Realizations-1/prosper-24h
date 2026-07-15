import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const CreateSecurityBaselineSchema = z.object({
  referential: z.string().min(1),
  compliance: z.enum(['COMPLIANT', 'PARTIAL', 'NON_COMPLIANT']).default('PARTIAL'),
  gap: z.string().optional(),
});

export class SecurityBaselineService {
  static async create(studyId: string, data: z.infer<typeof CreateSecurityBaselineSchema>, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    const validated = CreateSecurityBaselineSchema.parse(data);
    return prisma.securityBaseline.create({
      data: { ...validated, studyId },
    });
  }

  static async getAll(studyId: string, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    return prisma.securityBaseline.findMany({ where: { studyId } });
  }

  static async update(id: string, data: Partial<z.infer<typeof CreateSecurityBaselineSchema>>, userId: string) {
    const sb = await prisma.securityBaseline.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(sb.studyId, userId);
    return prisma.securityBaseline.update({ where: { id }, data });
  }

  static async delete(id: string, userId: string) {
    const sb = await prisma.securityBaseline.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(sb.studyId, userId);
    return prisma.securityBaseline.delete({ where: { id } });
  }

  private static async validateStudyAccess(studyId: string, userId: string) {
    const study = await prisma.study.findUniqueOrThrow({ where: { id: studyId } });
    if (study.ownerId !== userId) {
      const studyUser = await prisma.studyUser.findFirst({ where: { studyId, userId } });
      if (!studyUser) throw new Error('Not authorized');
    }
  }
}
