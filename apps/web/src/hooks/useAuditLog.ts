import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export interface AuditLogEntry {
  id: string;
  studyId: string;
  userId: string;
  action: string;
  target: string;
  targetId: string | null;
  details: string | null;
  createdAt: string;
  user: { email: string };
}

export function useAuditLog(studyId: string) {
  const { accessToken } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/studies/${studyId}/audit-log`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Erreur lors du chargement du journal');
      setLogs(await res.json());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [studyId, accessToken]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, error, refresh: fetchLogs };
}
