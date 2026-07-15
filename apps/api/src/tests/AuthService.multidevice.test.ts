import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks Prisma hoisted
const {
  mockDeleteMany,
  mockFindMany,
  mockFindUnique,
  mockUpdateMany,
} = vi.hoisted(() => ({
  mockDeleteMany: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdateMany: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    refreshToken: {
      deleteMany: mockDeleteMany,
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      updateMany: mockUpdateMany,
      create: vi.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: vi.fn(),
    },
  })),
  UserRole: { CONTRIBUTOR: 'CONTRIBUTOR', ADMIN: 'ADMIN' },
}));

import { AuthService } from '../services/AuthService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthService.revokeAllRefreshTokens', () => {
  it('supprime tous les refresh tokens de l\'utilisateur', async () => {
    mockDeleteMany.mockResolvedValue({ count: 3 });

    await AuthService.revokeAllRefreshTokens('user-1');

    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  it('ne lève pas d\'erreur si l\'utilisateur n\'a aucun token', async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });

    await expect(AuthService.revokeAllRefreshTokens('user-inexistant')).resolves.toBeUndefined();
  });
});

describe('AuthService.listActiveSessions', () => {
  it('retourne uniquement les sessions actives (non révoquées et non expirées)', async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 1000 * 60 * 60);
    const mockSessions = [
      { id: 'tok-1', createdAt: now, expiresAt: future },
      { id: 'tok-2', createdAt: new Date(now.getTime() - 1000), expiresAt: future },
    ];
    mockFindMany.mockResolvedValue(mockSessions);

    const sessions = await AuthService.listActiveSessions('user-1');

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      select: { id: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toMatchObject({ id: 'tok-1' });
  });

  it('retourne un tableau vide si aucune session active', async () => {
    mockFindMany.mockResolvedValue([]);

    const sessions = await AuthService.listActiveSessions('user-sans-session');

    expect(sessions).toEqual([]);
  });
});
