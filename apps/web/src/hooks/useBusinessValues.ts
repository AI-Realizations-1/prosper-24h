import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function useBusinessValues(studyId: string) {
  const { accessToken } = useAuth();
  const [businessValues, setBusinessValues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/studies/${studyId}/business-values`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) setBusinessValues(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studyId, accessToken]);

  return { businessValues, loading };
}
