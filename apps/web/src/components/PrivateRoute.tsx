import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { accessToken, authLoading } = useAuth();

  if (authLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement…</div>;
  }

  return accessToken ? <>{children}</> : <Navigate to="/login" replace />;
}
