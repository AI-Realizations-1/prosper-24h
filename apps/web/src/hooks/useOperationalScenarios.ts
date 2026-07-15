import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface SupportingAssetRef {
  supportingAsset: { id: string; name: string; type: string };
}

interface StrategicScenarioRef {
  id: string;
  likelihood: number;
  pair: {
    riskSource: { name: string };
    targetObjective: { description: string };
  };
  fearEvent: { description: string };
}

export interface OperationalScenario {
  id: string;
  studyId: string;
  strategicScenarioId: string;
  description?: string;
  technicalLikelihood: number;
  strategicScenario: StrategicScenarioRef;
  supportingAssets: SupportingAssetRef[];
}

export function useOperationalScenarios(studyId: string) {
  const { accessToken } = useAuth();
  const [scenarios, setScenarios] = useState<OperationalScenario[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/studies/${studyId}/operational-scenarios`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setScenarios(await res.json());
    } finally { setLoading(false); }
  }, [studyId, accessToken]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = async (data: {
    strategicScenarioId: string;
    description?: string;
    technicalLikelihood: number;
    supportingAssetIds: string[];
  }) => {
    const res = await fetch(`/api/studies/${studyId}/operational-scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    if (res.ok) await fetchAll();
    return res;
  };

  const update = async (id: string, data: {
    description?: string;
    technicalLikelihood?: number;
    supportingAssetIds?: string[];
  }) => {
    const res = await fetch(`/api/studies/${studyId}/operational-scenarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    if (res.ok) await fetchAll();
    return res;
  };

  const remove = async (id: string) => {
    await fetch(`/api/studies/${studyId}/operational-scenarios/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await fetchAll();
  };

  return { scenarios, loading, create, update, remove, refetch: fetchAll };
}
