import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export interface TargetObjective {
  id: string;
  studyId: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export function useTargetObjectives(studyId: string) {
  const { accessToken } = useAuth();
  const [targetObjectives, setTargetObjectives] = useState<TargetObjective[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = accessToken;
      const res = await fetch(`/api/studies/${studyId}/target-objectives`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur chargement objectifs visés');
      const data = await res.json();
      setTargetObjectives(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [studyId, accessToken]);

  const create = async (payload: { description: string }) => {
    const token = accessToken;
    const res = await fetch(`/api/studies/${studyId}/target-objectives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Erreur création objectif visé');
    const created: TargetObjective = await res.json();
    setTargetObjectives((prev) => [...prev, created]);
    return created;
  };

  const remove = async (id: string) => {
    const token = accessToken;
    const res = await fetch(`/api/studies/${studyId}/target-objectives/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Erreur suppression objectif visé');
    setTargetObjectives((prev) => prev.filter((to) => to.id !== id));
  };

  return { targetObjectives, loading, error, fetchAll, create, remove };
}
