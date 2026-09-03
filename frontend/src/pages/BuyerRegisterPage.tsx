import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/apiClient';

export default function BuyerRegisterPage() {
  const [form, setForm] = useState({
    companyName: '',
    buyerType: 'Oil Mill Processor',
    phone: '',
    email: '',
    password: '',
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
      const username = form.companyName.toLowerCase().replace(/\s+/g, '_') + '_' + Math.floor(Math.random() * 1000);
      await apiClient.post('/api/v1/auth/register', {
        username,
        email: form.email,
        password: form.password,
        role: 'buyer',
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
      navigate('/buyer/home');
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
      background: 'rgba(30,41,59,0.95)', border: '1px solid #6366f144',
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
      width: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
      color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0',
      fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 8, marginBottom: 14,
      boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
    } as React.CSSProperties,
    backLink: { display: 'block', textAlign: 'center' as const, color: '#64748b', fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
    error: { background: '#ef444422', border: '1px solid #ef444444', color: '#fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 } as React.CSSProperties,
  };

  const BUYER_TYPES = ['Oil Mill Processor', 'Agricultural Trader', 'Export House', 'Cold Storage Operator', 'Institutional Purchaser'];

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={s.box}>
        <div style={s.header}>
          <div style={{ fontSize: 44, marginBottom: 6 }}>🏢</div>
          <h1 style={s.title}>Create Buyer Account</h1>
          <p style={s.subtitle}>Connect directly with oilseed farmers and secure quality harvests</p>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleRegister}>
          <label style={s.label}>Buyer / Company Name *</label>
          <input style={s.input} type="text" required placeholder="Krishna Oil Mills Pvt Ltd"
            value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} />

          <div style={s.row}>
            <div>
              <label style={s.label}>Buyer Type *</label>
              <select style={s.input} value={form.buyerType} onChange={e => setForm(f => ({ ...f, buyerType: e.target.value }))}>
                {BUYER_TYPES.map(bt => <option key={bt}>{bt}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Phone Number *</label>
              <input style={s.input} type="tel" required placeholder="9876543210"
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          <label style={s.label}>Email Address *</label>
          <input style={s.input} type="email" required placeholder="procurement@krishnaoil.com"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />

          <label style={s.label}>Password * (min. 8 characters)</label>
          <input style={s.input} type="password" required minLength={8} placeholder="Password"
            value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />

          <label style={s.label}>Facility / HQ Location *</label>
          <input style={s.input} type="text" required placeholder="Dharwad Industrial Estate, Karnataka"
            value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />

          <button style={{ ...s.btn, opacity: isLoading ? 0.7 : 1 }} type="submit" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Register as Buyer →'}
          </button>
          <span style={s.backLink} onClick={() => navigate('/login/buyer')}>
            Already registered? Buyer Login
          </span>
        </form>
      </div>
    </div>
  );
}
