import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export interface CoherenceResult {
  coherent: boolean;
  warnings: string[];
}

export function useCoherence(studyId: string) {
  const { accessToken } = useAuth();
  const [result, setResult] = useState<CoherenceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkCoherence = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/studies/${studyId}/coherence`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Erreur lors de la vérification de cohérence');
      setResult(await res.json());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [studyId, accessToken]);

  useEffect(() => {
    checkCoherence();
  }, [checkCoherence]);

  return { result, loading, error, refresh: checkCoherence };
}
