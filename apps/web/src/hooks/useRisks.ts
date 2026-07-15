import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export interface Risk {
  id: string;
  studyId: string;
  operationalScenarioId: string;
  level: number;
  treatmentDecision: 'PENDING' | 'REDUCTION' | 'ACCEPTANCE' | 'TRANSFER' | 'REFUSAL';
  residualLevel?: number;
  justification?: string;
  operationalScenario: {
    id: string;
    description?: string;
    technicalLikelihood: number;
    strategicScenario: {
      likelihood: number;
      pair: { riskSource: { name: string }; targetObjective: { description: string } };
      fearEvent: { description: string };
    };
    supportingAssets: Array<{ supportingAsset: { name: string } }>;
  };
  securityMeasures: Array<{ id: string; name: string; status: string; priority: number }>;
}

export function useRisks(studyId: string) {
  const { accessToken } = useAuth();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/studies/${studyId}/risks`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setRisks(await res.json());
    } finally { setLoading(false); }
  }, [studyId, accessToken]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = async (data: {
    operationalScenarioId: string;
    level: number;
    treatmentDecision?: string;
    residualLevel?: number;
    justification?: string;
  }) => {
    const res = await fetch(`/api/studies/${studyId}/risks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    if (res.ok) await fetchAll();
    return res;
  };

  const update = async (id: string, data: {
    level?: number;
    treatmentDecision?: string;
    residualLevel?: number;
    justification?: string;
  }) => {
    const res = await fetch(`/api/studies/${studyId}/risks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    if (res.ok) await fetchAll();
    return res;
  };

  const remove = async (id: string) => {
    await fetch(`/api/studies/${studyId}/risks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await fetchAll();
  };

  return { risks, loading, create, update, remove, refetch: fetchAll };
}
