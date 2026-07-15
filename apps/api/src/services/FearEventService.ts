import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const CreateFearEventSchema = z.object({
  businessValueId: z.string().min(1),
  description: z.string().min(1),
  gravity: z.number().int().min(1).max(4),
  supportingAssetIds: z.array(z.string()).optional().default([]),
});

export class FearEventService {
  static async create(studyId: string, data: z.infer<typeof CreateFearEventSchema>, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    const { supportingAssetIds, ...rest } = CreateFearEventSchema.parse(data);
    return prisma.fearEvent.create({
      data: {
        ...rest,
        studyId,
        supportingAssets: { connect: supportingAssetIds.map((id) => ({ id })) },
      },
      include: { businessValue: true, supportingAssets: true },
    });
  }

  static async getAll(studyId: string, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    return prisma.fearEvent.findMany({
      where: { studyId },
      include: { businessValue: true, supportingAssets: true },
    });
  }

  static async update(id: string, data: Partial<z.infer<typeof CreateFearEventSchema>>, userId: string) {
    const fe = await prisma.fearEvent.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(fe.studyId, userId);
    const { supportingAssetIds, ...rest } = data;
    return prisma.fearEvent.update({
      where: { id },
      data: {
        ...rest,
        ...(supportingAssetIds !== undefined && {
          supportingAssets: { set: supportingAssetIds.map((saId) => ({ id: saId })) },
        }),
      },
      include: { businessValue: true, supportingAssets: true },
    });
  }

  static async delete(id: string, userId: string) {
    const fe = await prisma.fearEvent.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(fe.studyId, userId);
    return prisma.fearEvent.delete({ where: { id } });
  }

  private static async validateStudyAccess(studyId: string, userId: string) {
    const study = await prisma.study.findUniqueOrThrow({ where: { id: studyId } });
    if (study.ownerId !== userId) {
      const studyUser = await prisma.studyUser.findFirst({ where: { studyId, userId } });
      if (!studyUser) throw new Error('Not authorized');
    }
  }
}
