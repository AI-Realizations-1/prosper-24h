import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Member {
  id: string;
  studyId: string;
  userId: string;
  role: string;
  user: { id: string; email: string };
}

interface Props {
  studyId: string;
  ownerId: string;
  currentUserId: string;
}

export function StudyMembersPanel({ studyId, ownerId, currentUserId }: Props) {
  const { accessToken } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [error, setError] = useState<string | null>(null);

  const isOwner = currentUserId === ownerId;

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/studies/${studyId}/members`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Erreur');
      setMembers(await res.json());
    } catch {
      setError('Impossible de charger les membres');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [studyId]);

  const addMember = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/studies/${studyId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Erreur');
      }
      setEmail('');
      fetchMembers();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      await fetch(`/api/studies/${studyId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      fetchMembers();
    } catch {
      setError('Impossible de retirer le membre');
    }
  };

  if (loading) return <p>Chargement des membres…</p>;

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 6, marginTop: 16, padding: 16 }}>
      <h3 style={{ margin: '0 0 12px' }}>Membres de l'étude</h3>

      {error && <p style={{ color: '#b91c1c', marginBottom: 8 }}>{error}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#f0f4ff' }}>
            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Email</th>
            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Rôle</th>
            {isOwner && <th style={{ padding: '6px 8px' }}></th>}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '5px 8px' }}>{m.user.email}</td>
              <td style={{ padding: '5px 8px' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 10, fontSize: 11,
                  background: m.role === 'EDITOR' ? '#dbeafe' : '#f3f4f6',
                }}>
                  {m.role}
                </span>
              </td>
              {isOwner && (
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <button
                    onClick={() => removeMember(m.userId)}
                    style={{ cursor: 'pointer', color: '#dc2626', background: 'none', border: 'none', fontSize: 12 }}
                  >
                    Retirer
                  </button>
                </td>
              )}
            </tr>
          ))}
          {members.length === 0 && (
            <tr><td colSpan={isOwner ? 3 : 2} style={{ padding: 8, color: '#888' }}>Aucun membre partagé</td></tr>
          )}
        </tbody>
      </table>

      {isOwner && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="email"
            placeholder="Email du membre"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ flex: 1, padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4 }}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4 }}
          >
            <option value="VIEWER">VIEWER</option>
            <option value="EDITOR">EDITOR</option>
          </select>
          <button
            onClick={addMember}
            disabled={!email}
            style={{ padding: '6px 14px', cursor: 'pointer', background: '#1a56db', color: 'white', border: 'none', borderRadius: 4 }}
          >
            Ajouter
          </button>
        </div>
      )}
    </div>
  );
}
