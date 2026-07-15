import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function useStudy(studyId: string) {
  const { accessToken } = useAuth();
  const [study, setStudy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudy = async () => {
      try {
        const res = await fetch(`/api/studies/${studyId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          setStudy(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudy();
  }, [studyId, accessToken]);

  return { study, loading };
}
