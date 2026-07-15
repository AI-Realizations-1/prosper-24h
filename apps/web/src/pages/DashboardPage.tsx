import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Study {
  id: string;
  name: string;
  status: string;
}

export function DashboardPage() {
  const { accessToken, logout, fetchWithAuth } = useAuth();
  const navigate = useNavigate();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingStudy, setCreatingStudy] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const fetchStudies = async () => {
    try {
      const res = await fetch('/api/studies', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setStudies(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudies();
  }, [accessToken]);

  const createNewStudy = async () => {
    setCreatingStudy(true);
    try {
      const studyName = `Nouvelle étude ${new Date().toLocaleString('fr-FR')}`;
      const res = await fetchWithAuth('/api/studies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: studyName,
          scope: 'À définir',
          description: 'Étude créée depuis le tableau de bord',
        }),
      });

      if (!res.ok) {
        throw new Error('Impossible de créer l’étude');
      }

      const study = (await res.json()) as Study;
      navigate(`/study/${study.id}/atelier-1`);
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingStudy(false);
    }
  };

  const duplicateStudy = async (e: React.MouseEvent, studyId: string) => {
    e.stopPropagation();
    setDuplicating(studyId);
    try {
      const res = await fetch(`/api/studies/${studyId}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        await fetchStudies();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDuplicating(null);
    }
  };

  const handleLogoutAll = async () => {
    setLoggingOutAll(true);
    try {
      await fetchWithAuth('/api/auth/logout-all', { method: 'POST' });
      logout();
    } catch {
      // best effort
    } finally {
      setLoggingOutAll(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch('/api/studies/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(json),
      });
      if (res.ok) {
        await fetchStudies();
      }
    } catch (err) {
      console.error('Import échoué :', err);
    }
    if (importRef.current) importRef.current.value = '';
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Tableau de bord — Prosper EBIOS RM</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={createNewStudy} disabled={creatingStudy} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          {creatingStudy ? 'Création…' : '+ Créer une étude'}
        </button>
        <button onClick={() => importRef.current?.click()} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          Importer JSON
        </button>
        <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
      </div>
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div>
          <h2>Mes études</h2>
          {studies.length === 0 ? (
            <p>Aucune étude. Créez-en une !</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {studies.map((study) => (
                <li
                  key={study.id}
                  onClick={() => navigate(`/study/${study.id}/atelier-1`)}
                  style={{ cursor: 'pointer', padding: '10px', marginBottom: '5px', border: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span>{study.name} ({study.status})</span>
                  <button
                    onClick={(e) => duplicateStudy(e, study.id)}
                    disabled={duplicating === study.id}
                    style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                  >
                    {duplicating === study.id ? '…' : 'Dupliquer'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <button
        onClick={logout}
        style={{ padding: '8px 16px', marginTop: '20px', cursor: 'pointer', background: '#f0f0f0' }}
      >
        Déconnexion
      </button>
      <button
        onClick={handleLogoutAll}
        disabled={loggingOutAll}
        style={{ padding: '8px 16px', marginTop: '20px', marginLeft: '8px', cursor: 'pointer', background: '#ffe0e0', color: '#a00' }}
      >
        {loggingOutAll ? '…' : 'Déconnecter tous les appareils'}
      </button>
    </div>
  );
}
