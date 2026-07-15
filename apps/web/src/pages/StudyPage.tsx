import { useParams } from 'react-router-dom';
import { AtlierLayout } from '../components/AtlierLayout';
import { StudySummaryPanel } from '../components/StudySummaryPanel';
import { StudyMembersPanel } from '../components/StudyMembersPanel';
import { useStudy } from '../hooks/useStudy';
import { useAuth } from '../context/AuthContext';

export function StudyPage() {
  const { studyId } = useParams<{ studyId: string }>();
  const { study, loading } = useStudy(studyId!);
  const { userId } = useAuth();

  if (loading) return <p>Chargement...</p>;
  if (!study) return <p>Étude non trouvée</p>;

  const s = study as { name: string; description?: string; ownerId: string };

  return (
    <div style={{ padding: '20px' }}>
      <h1>{s.name}</h1>
      {s.description && <p>{s.description}</p>}
      <AtlierLayout studyId={studyId!} />
      <StudySummaryPanel studyId={studyId!} />
      <StudyMembersPanel
        studyId={studyId!}
        ownerId={s.ownerId}
        currentUserId={userId ?? ''}
      />
    </div>
  );
}
