import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/apiClient';
import { USE_MOCKS } from '../mocks';

export default function BuyerLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // Initialized to empty string - NO error on initial render
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError('');

    const u = customUser || username;
    const p = customPass || password;

    if (USE_MOCKS) {
      login('mock_buyer_token', {
        id: 2,
        username: u || 'buyer_demo',
        email: 'buyer@cropshift.org',
        role: 'buyer'
      });
      navigate('/buyer');
      setIsLoading(false);
      return;
    }

    try {
      const formData = new URLSearchParams();
      formData.append('username', u);
      formData.append('password', p);

      const res = await apiClient.post('/api/v1/auth/token', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const token = res.data.access_token;

      const userRes = await apiClient.get('/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (userRes.data.role && userRes.data.role !== 'buyer') {
        setError('This account is registered as a Farmer. Please use Farmer Login.');
        setIsLoading(false);
        return;
      }

      login(token, userRes.data);
      navigate('/buyer/home');
    } catch (err: any) {
      setError(err?.message || err?.response?.data?.detail || 'Incorrect username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
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
      border: '1px solid #6366f144',
      borderRadius: 20,
      padding: '32px 28px',
      width: '100%',
      maxWidth: 420,
      backdropFilter: 'blur(20px)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    } as React.CSSProperties,
    header: { textAlign: 'center' as const, marginBottom: 20 } as React.CSSProperties,
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
      width: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
      color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0',
      fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 10,
      boxShadow: '0 4px 15px rgba(99,102,241,0.35)', transition: 'all 0.2s',
    } as React.CSSProperties,
    btnSecondary: {
      width: '100%', background: 'transparent', color: '#818cf8',
      border: '1px solid #6366f155', borderRadius: 10, padding: '10px 0',
      fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 14,
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
    demoBox: {
      background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
      padding: '12px 14px', marginBottom: 18, fontSize: 12, color: '#94a3b8',
    } as React.CSSProperties,
    chip: {
      background: '#6366f122', color: '#818cf8', border: '1px solid #6366f144',
      borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
      fontWeight: 600, display: 'inline-block', margin: '3px 4px 0 0',
    } as React.CSSProperties,
  };

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.icon}>🏢</div>
          <h1 style={s.title}>Welcome back, Buyer</h1>
          <p style={s.subtitle}>Sign in to post demands, browse lots & place bids</p>
        </div>

        {/* Quick Demo Buyer Fill */}
        <div style={s.demoBox}>
          <div style={{ color: '#cbd5e1', fontWeight: 600, marginBottom: 6 }}>💡 Quick Demo Buyer Logins (Click to autofill):</div>
          <span style={{ ...s.chip, background: '#6366f144', color: '#a5b4fc', fontWeight: 700 }} onClick={() => handleDemoFill('buyer@cropshift.demo', 'demo123')}>
            ABC Agro Traders (buyer@cropshift.demo)
          </span>
          <span style={s.chip} onClick={() => handleDemoFill('buyer2@cropshift.demo', 'demo123')}>
            Buyer 2 (buyer2@cropshift.demo)
          </span>
          <span style={s.chip} onClick={() => handleDemoFill('buyer3@cropshift.demo', 'demo123')}>
            Buyer 3 (buyer3@cropshift.demo)
          </span>
        </div>

        {/* Display error ONLY if login failed (error string is non-empty) */}
        {error ? <div style={s.error}>{error}</div> : null}

        <form onSubmit={e => handleLogin(e)}>
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
            {isLoading ? 'Logging in...' : 'Login as Buyer →'}
          </button>

          <button type="button" style={s.btnSecondary} onClick={() => navigate('/register/buyer')}>
            Create Buyer Account
          </button>

          <span style={s.backLink} onClick={() => navigate('/select-role')}>
            ← Back to role selection
          </span>
        </form>
      </div>
    </div>
  );
}
