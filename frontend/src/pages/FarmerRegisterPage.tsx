import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/apiClient';

export default function FarmerRegisterPage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    state: 'Karnataka',
    district: '',
    location: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Register farmer user
      const username = form.name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.floor(Math.random() * 1000);
      await apiClient.post('/api/v1/auth/register', {
        username,
        email: form.email,
        password: form.password,
        role: 'farmer',
      });

      // Auto login
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', form.password);

      const res = await apiClient.post('/api/v1/auth/token', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const token = res.data.access_token;

      const userRes = await apiClient.get('/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      login(token, userRes.data);
      navigate('/farmer/home');
    } catch (err: any) {
      setError(err?.message || err?.response?.data?.detail || 'Registration failed.');
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
      background: 'rgba(30,41,59,0.95)', border: '1px solid #22c55e44',
      borderRadius: 24, padding: 44, width: '100%', maxWidth: 500,
      backdropFilter: 'blur(20px)',
    } as React.CSSProperties,
    header: { textAlign: 'center' as const, marginBottom: 24 } as React.CSSProperties,
    title: { fontSize: 26, fontWeight: 800, color: '#f8fafc', marginBottom: 4 } as React.CSSProperties,
    subtitle: { color: '#94a3b8', fontSize: 14 } as React.CSSProperties,
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } as React.CSSProperties,
    label: { display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6, fontWeight: 500 } as React.CSSProperties,
    input: {
      width: '100%', background: '#1e293b', color: '#f8fafc',
      border: '1px solid #334155', borderRadius: 10, padding: '11px 16px',
      fontSize: 14, boxSizing: 'border-box' as const, outline: 'none',
      marginBottom: 14,
    } as React.CSSProperties,
    btn: {
      width: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)',
      color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0',
      fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 8, marginBottom: 14,
      boxShadow: '0 4px 15px rgba(34,197,94,0.3)',
    } as React.CSSProperties,
    backLink: { display: 'block', textAlign: 'center' as const, color: '#64748b', fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
    error: { background: '#ef444422', border: '1px solid #ef444444', color: '#fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 } as React.CSSProperties,
  };

  const STATES = ['Karnataka', 'Maharashtra', 'Rajasthan', 'Madhya Pradesh', 'Andhra Pradesh', 'Tamil Nadu', 'Gujarat'];

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={s.box}>
        <div style={s.header}>
          <div style={{ fontSize: 44, marginBottom: 6 }}>🌾</div>
          <h1 style={s.title}>Create Farmer Account</h1>
          <p style={s.subtitle}>Join CropShift to get crop recommendations & connect with buyers</p>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleRegister}>
          <div style={s.row}>
            <div>
              <label style={s.label}>Farmer Name *</label>
              <input style={s.input} type="text" required placeholder="Ramesh Kumar"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={s.label}>Phone Number *</label>
              <input style={s.input} type="tel" required placeholder="9876543210"
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          <label style={s.label}>Email Address *</label>
          <input style={s.input} type="email" required placeholder="ramesh@farm.in"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />

          <label style={s.label}>Password * (min. 8 characters)</label>
          <input style={s.input} type="password" required minLength={8} placeholder="Password"
            value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />

          <div style={s.row}>
            <div>
              <label style={s.label}>State *</label>
              <select style={s.input} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                {STATES.map(st => <option key={st}>{st}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>District *</label>
              <input style={s.input} type="text" required placeholder="Tumkur / Haveri"
                value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} />
            </div>
          </div>

          <label style={s.label}>Taluk / Village Location</label>
          <input style={s.input} type="text" placeholder="Gubbi Taluk"
            value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />

          <button style={{ ...s.btn, opacity: isLoading ? 0.7 : 1 }} type="submit" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Register as Farmer →'}
          </button>
          <span style={s.backLink} onClick={() => navigate('/login/farmer')}>
            Already registered? Farmer Login
          </span>
        </form>
      </div>
    </div>
  );
}
