import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export interface SecurityMeasure {
  id: string;
  studyId: string;
  riskId: string;
  name: string;
  description?: string;
  type: 'PREVENTIVE' | 'DETECTIVE' | 'CORRECTIVE';
  priority: number;
  status: 'PLANNED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'VERIFIED';
  dueDate?: string;
  risk: { id: string; level: number; treatmentDecision: string };
}

export function useSecurityMeasures(studyId: string) {
  const { accessToken } = useAuth();
  const [measures, setMeasures] = useState<SecurityMeasure[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/studies/${studyId}/security-measures`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setMeasures(await res.json());
    } finally { setLoading(false); }
  }, [studyId, accessToken]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = async (data: {
    riskId: string;
    name: string;
    description?: string;
    type: string;
    priority?: number;
    status?: string;
    dueDate?: string;
  }) => {
    const res = await fetch(`/api/studies/${studyId}/security-measures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    if (res.ok) await fetchAll();
    return res;
  };

  const update = async (id: string, data: {
    name?: string;
    description?: string;
    type?: string;
    priority?: number;
    status?: string;
    dueDate?: string | null;
  }) => {
    const res = await fetch(`/api/studies/${studyId}/security-measures/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    if (res.ok) await fetchAll();
    return res;
  };

  const remove = async (id: string) => {
    await fetch(`/api/studies/${studyId}/security-measures/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await fetchAll();
  };

  return { measures, loading, create, update, remove, refetch: fetchAll };
}
