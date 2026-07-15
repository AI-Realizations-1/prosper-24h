import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StudySummaryPanel } from '../components/StudySummaryPanel';

const mockRefresh = vi.fn();

let summaryState: {
  summary: {
    atelier1: { businessValues: number; supportingAssets: number; fearEvents: number; securityBaselines: number };
    atelier2: { riskSources: number; targetObjectives: number; pairs: number };
    atelier3: { stakeholders: number; strategicScenarios: number };
    atelier4: { operationalScenarios: number };
    atelier5: { risks: number; pendingRisks: number; criticalRisks: number; securityMeasures: number };
  } | null;
  loading: boolean;
} = {
  summary: {
    atelier1: { businessValues: 3, supportingAssets: 5, fearEvents: 2, securityBaselines: 4 },
    atelier2: { riskSources: 2, targetObjectives: 3, pairs: 4 },
    atelier3: { stakeholders: 3, strategicScenarios: 4 },
    atelier4: { operationalScenarios: 6 },
    atelier5: { risks: 6, pendingRisks: 1, criticalRisks: 2, securityMeasures: 8 },
  },
  loading: false,
};

let coherenceState: { result: { coherent: boolean; warnings: string[] } | null; loading: boolean } = {
  result: { coherent: false, warnings: ['BV sans SA'] },
  loading: false,
};

let logsState: {
  logs: Array<{ id: string; createdAt: string; user: { email: string }; action: string; target: string; details?: string | null }>;
  loading: boolean;
} = {
  logs: [
    {
      id: 'log-1',
      createdAt: '2026-04-27T10:00:00.000Z',
      user: { email: 'audit@prosper.local' },
      action: 'STUDY_DUPLICATE',
      target: 'study-1',
      details: 'copie complete',
    },
  ],
  loading: false,
};

vi.mock('../hooks/useStudySummary', () => ({
  useStudySummary: () => ({
    summary: summaryState.summary,
    loading: summaryState.loading,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('../hooks/useCoherence', () => ({
  useCoherence: () => ({
    result: coherenceState.result,
    loading: coherenceState.loading,
    error: null,
    refresh: mockRefresh,
  }),
}));

vi.mock('../hooks/useAuditLog', () => ({
  useAuditLog: () => ({
    logs: logsState.logs,
    loading: logsState.loading,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ accessToken: 'test-token' }),
}));

beforeEach(() => {
  mockRefresh.mockReset();
  summaryState = {
    summary: {
      atelier1: { businessValues: 3, supportingAssets: 5, fearEvents: 2, securityBaselines: 4 },
      atelier2: { riskSources: 2, targetObjectives: 3, pairs: 4 },
      atelier3: { stakeholders: 3, strategicScenarios: 4 },
      atelier4: { operationalScenarios: 6 },
      atelier5: { risks: 6, pendingRisks: 1, criticalRisks: 2, securityMeasures: 8 },
    },
    loading: false,
  };
  coherenceState = { result: { coherent: false, warnings: ['BV sans SA'] }, loading: false };
  logsState = {
    logs: [
      {
        id: 'log-1',
        createdAt: '2026-04-27T10:00:00.000Z',
        user: { email: 'audit@prosper.local' },
        action: 'STUDY_DUPLICATE',
        target: 'study-1',
        details: 'copie complete',
      },
    ],
    loading: false,
  };

  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    blob: async () => new Blob(['file-content'], { type: 'application/octet-stream' }),
  });
  (globalThis as typeof globalThis & { fetch: unknown }).fetch = fetchMock;
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: vi.fn(() => 'blob:http://localhost/file'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: vi.fn(),
  });
});

describe('StudySummaryPanel', () => {
  it('affiche les onglets de navigation', () => {
    render(<StudySummaryPanel studyId="study-1" />);
    expect(screen.getByText('Synthèse')).toBeInTheDocument();
    expect(screen.getByText('Cohérence')).toBeInTheDocument();
    expect(screen.getByText('Journal')).toBeInTheDocument();
    expect(screen.getByText('Exports')).toBeInTheDocument();
  });

  it('affiche les KPI de synthèse dans le tableau', () => {
    render(<StudySummaryPanel studyId="study-1" />);
    expect(screen.getByText('Valeurs métier')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });

  it('affiche les avertissements de coherence et appelle refresh', () => {
    render(<StudySummaryPanel studyId="study-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Cohérence' }));
    expect(screen.getByText(/avertissement/i)).toBeInTheDocument();
    expect(screen.getByText('BV sans SA')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Actualiser' }));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('affiche le journal avec les metadonnees', () => {
    render(<StudySummaryPanel studyId="study-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Journal' }));
    expect(screen.getByText('STUDY_DUPLICATE')).toBeInTheDocument();
    expect(screen.getByText('audit@prosper.local')).toBeInTheDocument();
    expect(screen.getByText('copie complete')).toBeInTheDocument();
  });

  it('affiche et execute les exports securises', async () => {
    render(<StudySummaryPanel studyId="study-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Exports' }));

    const pdfButton = screen.getByRole('button', { name: 'Télécharger PDF' });
    const excelButton = screen.getByRole('button', { name: 'Télécharger Excel' });
    fireEvent.click(pdfButton);
    fireEvent.click(excelButton);

    await waitFor(() => {
      expect((globalThis as typeof globalThis & { fetch: ReturnType<typeof vi.fn> }).fetch).toHaveBeenCalledWith(
        '/api/studies/study-1/export/pdf',
        expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }),
      );
    });

    await waitFor(() => {
      expect((globalThis as typeof globalThis & { fetch: ReturnType<typeof vi.fn> }).fetch).toHaveBeenCalledWith(
        '/api/studies/study-1/export/excel',
        expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }),
      );
    });
  });

  it('affiche le message vide quand le journal est vide', () => {
    logsState = { logs: [], loading: false };
    render(<StudySummaryPanel studyId="study-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Journal' }));
    expect(screen.getByText('Aucune entrée dans le journal')).toBeInTheDocument();
  });

  it('affiche le fallback si la synthese est indisponible', () => {
    summaryState = { summary: null, loading: false };
    render(<StudySummaryPanel studyId="study-1" />);
    expect(screen.getByText('Aucune donnée')).toBeInTheDocument();
  });

  it('affiche le fallback coherence quand le resultat est indisponible', () => {
    coherenceState = { result: null, loading: false };
    render(<StudySummaryPanel studyId="study-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Cohérence' }));
    expect(screen.getByText('Impossible de charger les résultats')).toBeInTheDocument();
  });
});
