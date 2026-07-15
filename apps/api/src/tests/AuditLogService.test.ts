import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreate, mockFindMany } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    auditLogEntry: {
      create: mockCreate,
      findMany: mockFindMany,
    },
  })),
}));

import { AuditLogService } from '../services/AuditLogService';

describe('AuditLogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('log() appelle prisma.auditLogEntry.create avec les bons paramètres', async () => {
    mockCreate.mockResolvedValue({ id: 'entry-1' });

    const params = {
      studyId: 'study-1',
      userId: 'user-1',
      action: 'CREATE',
      target: 'BusinessValue',
    };
    await AuditLogService.log(params);

    expect(mockCreate).toHaveBeenCalledWith({ data: params });
  });

  it('getByStudy() retourne les entrées triées par date décroissante', async () => {
    const entries = [
      { id: 'e1', createdAt: new Date(), user: { email: 'a@test.com' } },
      { id: 'e2', createdAt: new Date(), user: { email: 'b@test.com' } },
    ];
    mockFindMany.mockResolvedValue(entries);

    const result = await AuditLogService.getByStudy('study-1');

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { studyId: 'study-1' },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toHaveLength(2);
  });
});
