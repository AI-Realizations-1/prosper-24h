import { PrismaClient, MeasureStatus } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const CreateMeasureSchema = z.object({
  riskId: z.string().cuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE']),
  priority: z.number().int().min(1).max(3).default(2),
  status: z.nativeEnum(MeasureStatus).default('PLANNED'),
  dueDate: z.string().datetime().optional(),
});

const UpdateMeasureSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE']).optional(),
  priority: z.number().int().min(1).max(3).optional(),
  status: z.nativeEnum(MeasureStatus).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

export class SecurityMeasureService {
  static async create(studyId: string, data: z.infer<typeof CreateMeasureSchema>, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    const { dueDate, ...rest } = CreateMeasureSchema.parse(data);
    return prisma.securityMeasure.create({
      data: {
        ...rest,
        studyId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
    });
  }

  static async getAll(studyId: string, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    return prisma.securityMeasure.findMany({
      where: { studyId },
      include: { risk: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  static async update(id: string, data: z.infer<typeof UpdateMeasureSchema>, userId: string) {
    const measure = await prisma.securityMeasure.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(measure.studyId, userId);
    const { dueDate, ...rest } = UpdateMeasureSchema.parse(data);
    return prisma.securityMeasure.update({
      where: { id },
      data: {
        ...rest,
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
    });
  }

  static async delete(id: string, userId: string) {
    const measure = await prisma.securityMeasure.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(measure.studyId, userId);
    return prisma.securityMeasure.delete({ where: { id } });
  }

  private static async validateStudyAccess(studyId: string, userId: string) {
    const study = await prisma.study.findUniqueOrThrow({ where: { id: studyId } });
    if (study.ownerId !== userId) {
      const su = await prisma.studyUser.findFirst({ where: { studyId, userId } });
      if (!su) throw new Error('Not authorized');
    }
  }
}
