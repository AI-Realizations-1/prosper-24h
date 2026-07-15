import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export interface StrategicScenario {
  id: string;
  studyId: string;
  pairId: string;
  fearEventId: string;
  likelihood: number;
  createdAt: string;
  updatedAt: string;
  pair: { id: string; riskSource: { id: string; name: string }; targetObjective: { id: string; description: string } };
  fearEvent: { id: string; description: string };
  stakeholders: Array<{ stakeholder: { id: string; name: string; category: string } }>;
}

export function useStrategicScenarios(studyId: string) {
  const { accessToken } = useAuth();
  const [scenarios, setScenarios] = useState<StrategicScenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = accessToken;
      const res = await fetch(`/api/studies/${studyId}/strategic-scenarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur chargement scénarios stratégiques');
      const data = await res.json();
      setScenarios(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [studyId, accessToken]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = async (payload: { pairId: string; fearEventId: string; likelihood: number; stakeholderIds?: string[] }) => {
    const token = accessToken;
    const res = await fetch(`/api/studies/${studyId}/strategic-scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Erreur création scénario stratégique');
    const created: StrategicScenario = await res.json();
    setScenarios((prev) => [...prev, created]);
    return created;
  };

  const updateLikelihood = async (id: string, likelihood: number) => {
    const token = accessToken;
    const res = await fetch(`/api/studies/${studyId}/strategic-scenarios/${id}/likelihood`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ likelihood }),
    });
    if (!res.ok) throw new Error('Erreur mise à jour vraisemblance');
    const updated: StrategicScenario = await res.json();
    setScenarios((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  };

  const remove = async (id: string) => {
    const token = accessToken;
    const res = await fetch(`/api/studies/${studyId}/strategic-scenarios/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Erreur suppression scénario stratégique');
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  };

  return { scenarios, loading, error, fetchAll, create, updateLikelihood, remove };
}
