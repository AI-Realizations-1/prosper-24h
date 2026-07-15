import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockStudyFindUniqueOrThrow, mockStudyCreate, mockStudyUserFindFirst } = vi.hoisted(() => ({
  mockStudyFindUniqueOrThrow: vi.fn(),
  mockStudyCreate: vi.fn(),
  mockStudyUserFindFirst: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    study: {
      findUniqueOrThrow: mockStudyFindUniqueOrThrow,
      create: mockStudyCreate,
    },
    studyUser: {
      findFirst: mockStudyUserFindFirst,
    },
    businessValue: { create: vi.fn() },
    supportingAsset: { create: vi.fn() },
    fearEvent: { create: vi.fn() },
    securityBaseline: { create: vi.fn() },
    riskSource: { create: vi.fn() },
    targetObjective: { create: vi.fn() },
    riskSourceObjectivePair: { create: vi.fn() },
    stakeholder: { create: vi.fn() },
    strategicScenario: { create: vi.fn() },
    strategicScenarioStakeholder: { create: vi.fn() },
    operationalScenario: { create: vi.fn() },
    operationalScenarioSupportingAsset: { create: vi.fn() },
    risk: { create: vi.fn() },
    securityMeasure: { create: vi.fn() },
    auditLogEntry: { create: vi.fn() },
  })),
}));

import { StudyService } from '../services/StudyService';

describe('StudyService.duplicateStudy()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse la duplication si l'utilisateur n'est ni propriétaire ni membre", async () => {
    mockStudyFindUniqueOrThrow.mockResolvedValue({
      ownerId: 'other-user',
      name: 'Test',
      description: null,
      scope: 'Test scope',
      businessValues: [],
      supportingAssets: [],
      fearEvents: [],
      securityBaselines: [],
      riskSources: [],
      targetObjectives: [],
      riskSourceObjectivePairs: [],
      stakeholders: [],
      strategicScenarios: [],
      operationalScenarios: [],
    });

    await expect(StudyService.duplicateStudy('study-1', 'user-1')).rejects.toThrow(
      'Only owner can duplicate'
    );
  });

  it("autorise la duplication si l'utilisateur est propriétaire", async () => {
    mockStudyFindUniqueOrThrow.mockResolvedValue({
      ownerId: 'user-1',
      name: 'Mon étude',
      description: null,
      scope: 'Périmètre test',
      businessValues: [],
      supportingAssets: [],
      fearEvents: [],
      securityBaselines: [],
      riskSources: [],
      targetObjectives: [],
      riskSourceObjectivePairs: [],
      stakeholders: [],
      strategicScenarios: [],
      operationalScenarios: [],
    });
    mockStudyCreate.mockResolvedValue({ id: 'new-study', name: 'Copie de Mon étude' });

    const result = await StudyService.duplicateStudy('study-1', 'user-1');

    expect(mockStudyCreate).toHaveBeenCalled();
    expect(result.name).toBe('Copie de Mon étude');
  });
});
