import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/apiClient';
import { USE_MOCKS } from '../mocks';

export default function FarmerLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // Initialized to empty string - NO error on initial render
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (USE_MOCKS) {
      login('mock_farmer_token', {
        id: 1,
        username: username || 'demo',
        email: 'farmer@cropshift.org',
        role: 'farmer'
      });
      navigate('/farmer');
      setIsLoading(false);
      return;
    }

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const res = await apiClient.post('/api/v1/auth/token', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const token = res.data.access_token;

      const userRes = await apiClient.get('/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (userRes.data.role && userRes.data.role !== 'farmer') {
        setError('This account is registered as a Buyer. Please use Buyer Login.');
        setIsLoading(false);
        return;
      }

      login(token, userRes.data);
      navigate('/farmer/home');
    } catch (err: any) {
      setError(err?.message || err?.response?.data?.detail || 'Incorrect username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const s = {
    page: {
      minHeight: '80vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', sans-serif", padding: '32px 16px',
    } as React.CSSProperties,
    card: {
      background: 'rgba(30, 41, 59, 0.95)',
      border: '1px solid #22c55e44',
      borderRadius: 20,
      padding: '32px 28px',
      width: '100%',
      maxWidth: 400,
      backdropFilter: 'blur(20px)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    } as React.CSSProperties,
    header: { textAlign: 'center' as const, marginBottom: 24 } as React.CSSProperties,
    icon: { fontSize: 40, marginBottom: 8 } as React.CSSProperties,
    title: { fontSize: 24, fontWeight: 800, color: '#f8fafc', marginBottom: 6, letterSpacing: '-0.3px' } as React.CSSProperties,
    subtitle: { color: '#94a3b8', fontSize: 13, lineHeight: 1.4 } as React.CSSProperties,
    label: { display: 'block', color: '#cbd5e1', fontSize: 13, marginBottom: 6, fontWeight: 500 } as React.CSSProperties,
    input: {
      width: '100%', background: '#1e293b', color: '#f8fafc',
      border: '1px solid #334155', borderRadius: 10, padding: '10px 14px',
      fontSize: 14, boxSizing: 'border-box' as const, outline: 'none',
      marginBottom: 16, transition: 'border-color 0.2s',
    } as React.CSSProperties,
    btnPrimary: {
      width: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)',
      color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0',
      fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 10,
      boxShadow: '0 4px 15px rgba(34,197,94,0.35)', transition: 'all 0.2s',
    } as React.CSSProperties,
    btnSecondary: {
      width: '100%', background: 'transparent', color: '#4ade80',
      border: '1px solid #22c55e55', borderRadius: 10, padding: '10px 0',
      fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 16,
      transition: 'all 0.2s',
    } as React.CSSProperties,
    backLink: {
      display: 'block', textAlign: 'center' as const, color: '#64748b',
      fontSize: 13, textDecoration: 'none', cursor: 'pointer', fontWeight: 500,
    } as React.CSSProperties,
    error: {
      background: '#ef444422', border: '1px solid #ef444455', color: '#fca5a5',
      borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16,
      textAlign: 'center' as const,
    } as React.CSSProperties,
  };

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.icon}>🌱</div>
          <h1 style={s.title}>Welcome back, Farmer</h1>
          <p style={s.subtitle}>Sign in to analyze your farm, plan crops & explore buyer demand</p>
        </div>

        {/* Display error ONLY if login failed (error string is non-empty) */}
        {error ? <div style={s.error}>{error}</div> : null}

        <div style={{
          background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155',
          borderRadius: 12, padding: 12, marginBottom: 20
        }}>
          <div style={{ color: '#cbd5e1', fontWeight: 600, fontSize: 12, marginBottom: 8 }}>
            💡 Quick Demo Farmer Credentials (Click to autofill):
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => { setUsername('farmer@cropshift.demo'); setPassword('demo123'); }}
              style={{ background: '#1e293b', color: '#4ade80', border: '1px solid #22c55e44', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
            >
              Rajesh Kumar (farmer@cropshift.demo)
            </button>
            <button
              type="button"
              onClick={() => { setUsername('farmer2@cropshift.demo'); setPassword('demo123'); }}
              style={{ background: '#1e293b', color: '#86efac', border: '1px solid #22c55e33', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
            >
              Farmer 2 (farmer2@cropshift.demo)
            </button>
            <button
              type="button"
              onClick={() => { setUsername('farmer3@cropshift.demo'); setPassword('demo123'); }}
              style={{ background: '#1e293b', color: '#86efac', border: '1px solid #22c55e33', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
            >
              Farmer 3 (farmer3@cropshift.demo)
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <label style={s.label}>Email / Phone / Username</label>
          <input
            style={s.input}
            type="text"
            value={username}
            required
            onChange={e => setUsername(e.target.value)}
            placeholder="Enter username or email"
          />

          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            value={password}
            required
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
          />

          <button style={{ ...s.btnPrimary, opacity: isLoading ? 0.7 : 1 }} type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login as Farmer →'}
          </button>

          <button type="button" style={s.btnSecondary} onClick={() => navigate('/register/farmer')}>
            Create Farmer Account
          </button>

          <span style={s.backLink} onClick={() => navigate('/select-role')}>
            ← Back to role selection
          </span>
        </form>
      </div>
    </div>
  );
}
