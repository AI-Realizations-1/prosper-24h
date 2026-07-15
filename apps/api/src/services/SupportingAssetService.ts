import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const CreateSupportingAssetSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  businessValueIds: z.array(z.string()).optional().default([]),
});

export class SupportingAssetService {
  static async create(studyId: string, data: z.infer<typeof CreateSupportingAssetSchema>, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    const { businessValueIds, ...rest } = CreateSupportingAssetSchema.parse(data);
    return prisma.supportingAsset.create({
      data: {
        ...rest,
        studyId,
        businessValues: { connect: businessValueIds.map((id) => ({ id })) },
      },
      include: { businessValues: true },
    });
  }

  static async getAll(studyId: string, userId: string) {
    await this.validateStudyAccess(studyId, userId);
    return prisma.supportingAsset.findMany({
      where: { studyId },
      include: { businessValues: true },
    });
  }

  static async update(id: string, data: Partial<z.infer<typeof CreateSupportingAssetSchema>>, userId: string) {
    const sa = await prisma.supportingAsset.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(sa.studyId, userId);
    const { businessValueIds, ...rest } = data;
    return prisma.supportingAsset.update({
      where: { id },
      data: {
        ...rest,
        ...(businessValueIds !== undefined && {
          businessValues: { set: businessValueIds.map((bvId) => ({ id: bvId })) },
        }),
      },
      include: { businessValues: true },
    });
  }

  static async delete(id: string, userId: string) {
    const sa = await prisma.supportingAsset.findUniqueOrThrow({ where: { id } });
    await this.validateStudyAccess(sa.studyId, userId);
    return prisma.supportingAsset.delete({ where: { id } });
  }

  private static async validateStudyAccess(studyId: string, userId: string) {
    const study = await prisma.study.findUniqueOrThrow({ where: { id: studyId } });
    if (study.ownerId !== userId) {
      const studyUser = await prisma.studyUser.findFirst({ where: { studyId, userId } });
      if (!studyUser) throw new Error('Not authorized');
    }
  }
}
