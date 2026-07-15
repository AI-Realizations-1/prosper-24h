import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function useSupportingAssets(studyId: string) {
  const { accessToken } = useAuth();
  const [supportingAssets, setSupportingAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/studies/${studyId}/supporting-assets`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) setSupportingAssets(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studyId, accessToken]);

  return { supportingAssets, loading };
}
