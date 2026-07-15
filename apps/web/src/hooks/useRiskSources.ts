import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export interface RiskSource {
  id: string;
  studyId: string;
  name: string;
  category: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export function useRiskSources(studyId: string) {
  const { accessToken } = useAuth();
  const [riskSources, setRiskSources] = useState<RiskSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = accessToken;
      const res = await fetch(`/api/studies/${studyId}/risk-sources`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur chargement sources de risque');
      const data = await res.json();
      setRiskSources(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [studyId, accessToken]);

  const create = async (payload: { name: string; category: string; description?: string }) => {
    const token = accessToken;
    const res = await fetch(`/api/studies/${studyId}/risk-sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Erreur création source de risque');
    const created: RiskSource = await res.json();
    setRiskSources((prev) => [...prev, created]);
    return created;
  };

  const remove = async (id: string) => {
    const token = accessToken;
    const res = await fetch(`/api/studies/${studyId}/risk-sources/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Erreur suppression source de risque');
    setRiskSources((prev) => prev.filter((rs) => rs.id !== id));
  };

  return { riskSources, loading, error, fetchAll, create, remove };
}
