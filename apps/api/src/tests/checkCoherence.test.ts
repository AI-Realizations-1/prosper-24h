import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockStudyFindUniqueOrThrow, mockStudyUserFindFirst, mockBVFindMany, mockSAFindMany, mockSSFindMany, mockOSFindMany, mockRiskCount } = vi.hoisted(() => ({
  mockStudyFindUniqueOrThrow: vi.fn(),
  mockStudyUserFindFirst: vi.fn(),
  mockBVFindMany: vi.fn(),
  mockSAFindMany: vi.fn(),
  mockSSFindMany: vi.fn(),
  mockOSFindMany: vi.fn(),
  mockRiskCount: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    study: { findUniqueOrThrow: mockStudyFindUniqueOrThrow },
    studyUser: { findFirst: mockStudyUserFindFirst },
    businessValue: { findMany: mockBVFindMany },
    supportingAsset: { findMany: mockSAFindMany },
    strategicScenario: { findMany: mockSSFindMany },
    operationalScenario: { findMany: mockOSFindMany },
    risk: { count: mockRiskCount },
  })),
}));

import { StudyService } from '../services/StudyService';

describe('StudyService.checkCoherence()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // L'utilisateur est propriétaire
    mockStudyFindUniqueOrThrow.mockResolvedValue({ ownerId: 'user-1' });
    mockStudyUserFindFirst.mockResolvedValue(null);
  });

  it('retourne coherent: true quand aucune incohérence', async () => {
    mockBVFindMany.mockResolvedValue([]);
    mockSAFindMany.mockResolvedValue([]);
    mockSSFindMany.mockResolvedValue([]);
    mockOSFindMany.mockResolvedValue([]);
    mockRiskCount.mockResolvedValue(0);

    const result = await StudyService.checkCoherence('study-1', 'user-1');

    expect(result.coherent).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('retourne des avertissements quand des BV sont sans bien support', async () => {
    mockBVFindMany.mockResolvedValue([{ id: 'bv-1', name: 'Données clients' }]);
    mockSAFindMany.mockResolvedValue([]);
    mockSSFindMany.mockResolvedValue([]);
    mockOSFindMany.mockResolvedValue([]);
    mockRiskCount.mockResolvedValue(0);

    const result = await StudyService.checkCoherence('study-1', 'user-1');

    expect(result.coherent).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Données clients');
  });

  it('signale les risques PENDING', async () => {
    mockBVFindMany.mockResolvedValue([]);
    mockSAFindMany.mockResolvedValue([]);
    mockSSFindMany.mockResolvedValue([]);
    mockOSFindMany.mockResolvedValue([]);
    mockRiskCount.mockResolvedValue(3);

    const result = await StudyService.checkCoherence('study-1', 'user-1');

    expect(result.coherent).toBe(false);
    expect(result.warnings[0]).toContain('3');
  });
});
