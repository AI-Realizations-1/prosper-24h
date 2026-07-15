import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LogEventParams {
  studyId: string;
  userId: string;
  action: string;
  target: string;
  targetId?: string;
  details?: string;
}

export class AuditLogService {
  static async log(params: LogEventParams): Promise<void> {
    await prisma.auditLogEntry.create({
      data: {
        studyId: params.studyId,
        userId: params.userId,
        action: params.action,
        target: params.target,
        targetId: params.targetId,
        details: params.details,
      },
    });
  }

  static async getByStudy(studyId: string) {
    return prisma.auditLogEntry.findMany({
      where: { studyId },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
