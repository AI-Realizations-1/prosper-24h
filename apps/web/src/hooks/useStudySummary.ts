import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export interface StudySummary {
  atelier1: { businessValues: number; supportingAssets: number; fearEvents: number; securityBaselines: number };
  atelier2: { riskSources: number; targetObjectives: number; pairs: number };
  atelier3: { stakeholders: number; strategicScenarios: number };
  atelier4: { operationalScenarios: number };
  atelier5: { risks: number; pendingRisks: number; criticalRisks: number; securityMeasures: number };
}

export function useStudySummary(studyId: string) {
  const { accessToken } = useAuth();
  const [summary, setSummary] = useState<StudySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/studies/${studyId}/summary`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Erreur lors du chargement de la synthèse');
      setSummary(await res.json());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [studyId, accessToken]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, error, refresh: fetchSummary };
}
