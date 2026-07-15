import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export interface FearEvent {
  id: string;
  studyId: string;
  businessValueId: string;
  description: string;
  gravity: number;
}

export function useFearEvents(studyId: string) {
  const { accessToken } = useAuth();
  const [fearEvents, setFearEvents] = useState<FearEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/studies/${studyId}/fear-events`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setFearEvents(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [studyId, accessToken]);

  return { fearEvents, loading, fetchAll };
}
