import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';

const mockNavigate = vi.fn();
const mockLogout = vi.fn();
const mockFetchWithAuth = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'test-token',
    logout: mockLogout,
    fetchWithAuth: mockFetchWithAuth,
  }),
}));

const fetchMock = vi.fn();
(globalThis as typeof globalThis & { fetch: unknown }).fetch = fetchMock;

beforeEach(() => {
  mockNavigate.mockReset();
  mockLogout.mockReset();
  mockFetchWithAuth.mockReset();
  mockFetchWithAuth.mockImplementation(async (url: string) => {
    if (url === '/api/auth/logout-all') {
      return { ok: true, json: async () => ({ message: 'ok' }) };
    }

    if (url === '/api/studies') {
      return { ok: true, json: async () => ({ id: 'study-created' }) };
    }

    return { ok: true, json: async () => ({}) };
  });
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/api/studies') && (!init || !init.method)) {
      return {
        ok: true,
        json: async () => [{ id: 'study-1', name: 'Étude EBIOS', status: 'DRAFT' }],
      };
    }
    if (url.endsWith('/api/studies/study-1/duplicate') && init?.method === 'POST') {
      return { ok: true, json: async () => ({ id: 'study-2' }) };
    }
    if (url.endsWith('/api/studies/import') && init?.method === 'POST') {
      return { ok: true, json: async () => ({ id: 'study-imported' }) };
    }
    return { ok: true, json: async () => ({}) };
  });
});

describe('DashboardPage', () => {
  it('affiche le titre principal', async () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByText(/Tableau de bord/i)).toBeInTheDocument();
    await screen.findByText(/Mes études/i);
  });

  it('navigue vers la creation d etude', async () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    const createButton = screen.getByText(/Créer une étude/i);
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        '/api/studies',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/study/study-created/atelier-1');
    });
  });

  it('importe un fichier json et recharge la liste', async () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    await screen.findByText(/Mes études/i);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([JSON.stringify({ name: 'Etude import' })], 'study.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/studies/import',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('duplique une etude et recharge la liste', async () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    await screen.findByText(/Étude EBIOS/i);
    fireEvent.click(screen.getByRole('button', { name: /Dupliquer/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/studies/study-1/duplicate',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('navigue vers l atelier 1 au clic sur une etude', async () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    const study = await screen.findByText(/Étude EBIOS/i);
    fireEvent.click(study);
    expect(mockNavigate).toHaveBeenCalledWith('/study/study-1/atelier-1');
  });

  it('declenche la deconnexion', async () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    const logoutButton = screen.getByRole('button', { name: /^Déconnexion$/i });
    fireEvent.click(logoutButton);
    expect(mockLogout).toHaveBeenCalledTimes(1);
    await screen.findByText(/Mes études/i);
  });

  it('declenche logout-all via fetchWithAuth et appelle logout', async () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    await screen.findByText(/Mes études/i);
    const btn = screen.getByRole('button', { name: /Déconnecter tous les appareils/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        '/api/auth/logout-all',
        { method: 'POST' },
      );
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });
});
