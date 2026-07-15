import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export interface Stakeholder {
  id: string;
  studyId: string;
  name: string;
  category: string;
  dependencyLevel: number;
  threatLevel: number;
  createdAt: string;
  updatedAt: string;
}

export function useStakeholders(studyId: string) {
  const { accessToken } = useAuth();
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = accessToken;
      const res = await fetch(`/api/studies/${studyId}/stakeholders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur chargement parties prenantes');
      const data = await res.json();
      setStakeholders(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [studyId, accessToken]);

  const create = async (payload: { name: string; category: string; dependencyLevel: number; threatLevel: number }) => {
    const token = accessToken;
    const res = await fetch(`/api/studies/${studyId}/stakeholders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Erreur création partie prenante');
    const created: Stakeholder = await res.json();
    setStakeholders((prev) => [...prev, created]);
    return created;
  };

  const remove = async (id: string) => {
    const token = accessToken;
    const res = await fetch(`/api/studies/${studyId}/stakeholders/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Erreur suppression partie prenante');
    setStakeholders((prev) => prev.filter((sh) => sh.id !== id));
  };

  return { stakeholders, loading, error, fetchAll, create, remove };
}
