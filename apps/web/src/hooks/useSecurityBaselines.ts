import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function useSecurityBaselines(studyId: string) {
  const { accessToken } = useAuth();
  const [securityBaselines, setSecurityBaselines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/studies/${studyId}/security-baselines`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) setSecurityBaselines(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studyId, accessToken]);

  return { securityBaselines, loading };
}
