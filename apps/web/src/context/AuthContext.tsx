import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthContextType {
  accessToken: string | null;
  userId: string | null;
  role: string | null;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch('/api/auth/csrf', { credentials: 'include' });
  if (!res.ok) throw new Error('CSRF fetch failed');
  const { csrfToken } = (await res.json()) as { csrfToken: string };
  return csrfToken;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Restauration de session au démarrage via cookie httpOnly
  useEffect(() => {
    const tryRestore = async () => {
      try {
        const csrfToken = await fetchCsrfToken();
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-CSRF-Token': csrfToken },
        });
        if (res.ok) {
          const data = (await res.json()) as { accessToken: string; userId: string; role: string };
          setAccessToken(data.accessToken);
          setUserId(data.userId);
          setRole(data.role);
        }
      } catch {
        // Pas de session active — aucune action
      } finally {
        setAuthLoading(false);
      }
    };
    tryRestore();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Login failed'));
    }
    const { user, accessToken: at } = (await res.json()) as {
      user: { id: string; role: string };
      accessToken: string;
    };
    setAccessToken(at);
    setUserId(user.id);
    setRole(user.role);
  };

  const register = async (email: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Register failed'));
    }
    await login(email, password);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {/* best effort */});
    setAccessToken(null);
    setUserId(null);
    setRole(null);
  };

  /**
   * Effectue un fetch authentifié.
   * Si la réponse est 401, tente un refresh automatique avant de réessayer.
   */
  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const existingHeaders = options.headers instanceof Headers
        ? Object.fromEntries(options.headers.entries())
        : (options.headers as Record<string, string> | undefined) ?? {};
      const authHeader: Record<string, string> = accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {};
      const headers: Record<string, string> = { ...existingHeaders, ...authHeader };

      let res = await fetch(url, { ...options, credentials: 'include', headers });

      if (res.status === 401) {
        // Tentative de refresh automatique
        try {
          const csrfToken = await fetchCsrfToken();
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: { 'X-CSRF-Token': csrfToken },
          });

          if (refreshRes.ok) {
            const data = (await refreshRes.json()) as {
              accessToken: string;
              userId: string;
              role: string;
            };
            setAccessToken(data.accessToken);
            setUserId(data.userId);
            setRole(data.role);

            // Réessai avec le nouveau token
            const retryHeaders: Record<string, string> = {
              ...existingHeaders,
              Authorization: `Bearer ${data.accessToken}`,
            };
            res = await fetch(url, {
              ...options,
              credentials: 'include',
              headers: retryHeaders,
            });
          } else {
            // Refresh échoué — forcer déconnexion
            setAccessToken(null);
            setUserId(null);
            setRole(null);
          }
        } catch {
          setAccessToken(null);
          setUserId(null);
          setRole(null);
        }
      }

      return res;
    },
    [accessToken],
  );

  return (
    <AuthContext.Provider value={{ accessToken, userId, role, authLoading, login, register, logout, fetchWithAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

