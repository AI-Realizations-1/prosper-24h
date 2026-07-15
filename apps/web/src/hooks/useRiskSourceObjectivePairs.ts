import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export type PairRelevance = 'PENDING' | 'RETAINED' | 'EXCLUDED';

export interface RiskSourceObjectivePair {
  id: string;
  studyId: string;
  riskSourceId: string;
  targetObjectiveId: string;
  relevance: PairRelevance;
  justification?: string;
  createdAt: string;
  updatedAt: string;
  riskSource: { id: string; name: string; category: string };
  targetObjective: { id: string; description: string };
}

export function useRiskSourceObjectivePairs(studyId: string) {
  const { accessToken } = useAuth();
  const [pairs, setPairs] = useState<RiskSourceObjectivePair[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = accessToken;
      const res = await fetch(`/api/studies/${studyId}/risk-source-objective-pairs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur chargement couples SR/OV');
      const data = await res.json();
      setPairs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [studyId, accessToken]);

  const create = async (payload: { riskSourceId: string; targetObjectiveId: string }) => {
    const token = accessToken;
    const res = await fetch(`/api/studies/${studyId}/risk-source-objective-pairs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Erreur création couple SR/OV');
    const created: RiskSourceObjectivePair = await res.json();
    setPairs((prev) => [...prev, created]);
    return created;
  };

  const updateRelevance = async (id: string, relevance: PairRelevance, justification?: string) => {
    const token = accessToken;
    const res = await fetch(`/api/studies/${studyId}/risk-source-objective-pairs/${id}/relevance`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ relevance, justification }),
    });
    if (!res.ok) throw new Error('Erreur mise à jour pertinence');
    const updated: RiskSourceObjectivePair = await res.json();
    setPairs((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  const remove = async (id: string) => {
    const token = accessToken;
    const res = await fetch(`/api/studies/${studyId}/risk-source-objective-pairs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Erreur suppression couple SR/OV');
    setPairs((prev) => prev.filter((p) => p.id !== id));
  };

  return { pairs, loading, error, fetchAll, create, updateRelevance, remove };
}
