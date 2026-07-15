import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto' }}>
      <h1>{isRegister ? 'Inscription' : 'Connexion'}</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ display: 'block', marginBottom: '10px', padding: '8px', width: '100%' }}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ display: 'block', marginBottom: '10px', padding: '8px', width: '100%' }}
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer' }}>
          {isRegister ? "S'inscrire" : 'Se connecter'}
        </button>
      </form>
      <p>
        {isRegister ? 'Déjà inscrit ?' : 'Pas encore inscrit ?'}{' '}
        <button
          onClick={() => setIsRegister(!isRegister)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}
        >
          {isRegister ? 'Connexion' : 'Inscription'}
        </button>
      </p>
    </div>
  );
}
