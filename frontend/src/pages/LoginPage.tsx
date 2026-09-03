import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/apiClient';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'farmer' | 'buyer'>('farmer');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
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
      login(token, userRes.data);
      if (userRes.data.role === 'buyer') {
        navigate('/buyer-dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await apiClient.post('/api/v1/auth/register', { username, email, password, role });
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
      login(token, userRes.data);
      if (role === 'buyer') {
        navigate('/buyer-dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const s = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', sans-serif", padding: 24,
    } as React.CSSProperties,
    box: {
      background: 'rgba(30,41,59,0.95)', border: '1px solid #334155',
      borderRadius: 24, padding: 48, width: '100%', maxWidth: 440,
      backdropFilter: 'blur(20px)',
    } as React.CSSProperties,
    logo: { textAlign: 'center' as const, marginBottom: 32 } as React.CSSProperties,
    logoText: { fontSize: 28, fontWeight: 800, color: '#f8fafc' } as React.CSSProperties,
    logoSub: { color: '#94a3b8', fontSize: 14, marginTop: 4 } as React.CSSProperties,
    tabs: { display: 'flex', background: '#1e293b', borderRadius: 12, padding: 4, marginBottom: 28 } as React.CSSProperties,
    tab: (active: boolean): React.CSSProperties => ({
      flex: 1, padding: '10px 0', textAlign: 'center', borderRadius: 9, border: 'none', cursor: 'pointer',
      fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
      background: active ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : 'transparent',
      color: active ? '#fff' : '#64748b',
    }),
    label: { display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6, fontWeight: 500 } as React.CSSProperties,
    input: {
      width: '100%', background: '#1e293b', color: '#f8fafc',
      border: '1px solid #334155', borderRadius: 10, padding: '11px 16px',
      fontSize: 14, boxSizing: 'border-box' as const, outline: 'none',
      marginBottom: 16,
    } as React.CSSProperties,
    btn: {
      width: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
      color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0',
      fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 4,
      boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
    } as React.CSSProperties,
    error: { background: '#ef444422', border: '1px solid #ef444444', color: '#fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 } as React.CSSProperties,
    roleRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 } as React.CSSProperties,
    roleBtn: (active: boolean): React.CSSProperties => ({
      padding: '14px 10px', borderRadius: 12, border: `2px solid ${active ? '#6366f1' : '#334155'}`,
      background: active ? '#6366f122' : '#1e293b', cursor: 'pointer',
      textAlign: 'center', color: active ? '#818cf8' : '#64748b',
    }),
    hint: { color: '#475569', fontSize: 12, textAlign: 'center' as const, marginTop: 20 } as React.CSSProperties,
  };

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={s.box}>
        <div style={s.logo}>
          <div style={s.logoText}>🌾 CropShift</div>
          <div style={s.logoSub}>Oilseed Market-Linkage Platform</div>
        </div>

        <div style={s.tabs}>
          <button style={s.tab(mode === 'login')} onClick={() => setMode('login')}>Login</button>
          <button style={s.tab(mode === 'register')} onClick={() => setMode('register')}>Register</button>
        </div>

        {error && <div style={s.error}>{error}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <label style={s.label}>Username</label>
            <input style={s.input} type="text" value={username} required
              onChange={e => setUsername(e.target.value)} placeholder="Enter your username" />
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={password} required
              onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
            <button style={{ ...s.btn, opacity: isLoading ? 0.7 : 1 }} type="submit" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login →'}
            </button>
            <div style={s.hint}>Demo: username=demo · password=password123</div>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <label style={s.label}>I am a...</label>
            <div style={s.roleRow}>
              <button type="button" style={s.roleBtn(role === 'farmer')} onClick={() => setRole('farmer')}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🌾</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Farmer</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>Grow & sell crops</div>
              </button>
              <button type="button" style={s.roleBtn(role === 'buyer')} onClick={() => setRole('buyer')}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🏢</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Buyer</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>Source oilseeds</div>
              </button>
            </div>
            <label style={s.label}>Username</label>
            <input style={s.input} type="text" value={username} required
              onChange={e => setUsername(e.target.value)} placeholder="Choose a username" />
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={email} required
              onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={password} required minLength={8}
              onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" />
            <button style={{ ...s.btn, opacity: isLoading ? 0.7 : 1 }} type="submit" disabled={isLoading}>
              {isLoading ? 'Creating account...' : `Register as ${role === 'farmer' ? '🌾 Farmer' : '🏢 Buyer'} →`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
