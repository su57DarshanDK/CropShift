import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMarketplaceDemands, getMarketplaceLots, createBuyerDemand } from '../services/api';
import type { BuyerDemand, MarketplaceLot } from '../types/api';

type Tab = 'demands' | 'future' | 'stock';

const CROPS = ['All', 'Groundnut', 'Mustard', 'Soybean', 'Sunflower', 'Sesame', 'Maize'];
const STATES = ['All', 'Karnataka', 'Maharashtra', 'Rajasthan', 'Madhya Pradesh'];

function MatchBadge({ score }: { score?: number }) {
  if (score === undefined || score === null) return null;
  const color =
    score >= 70 ? '#22c55e' :
    score >= 40 ? '#f59e0b' : '#94a3b8';
  return (
    <span style={{
      background: color + '22', color,
      border: `1px solid ${color}55`,
      borderRadius: 20, padding: '2px 10px',
      fontSize: 12, fontWeight: 700, marginLeft: 8,
    }}>
      {score}% match
    </span>
  );
}

function VerifiedBadge({ has }: { has: boolean }) {
  return has ? (
    <span style={{
      background: '#22c55e22', color: '#22c55e',
      border: '1px solid #22c55e44', borderRadius: 20,
      padding: '2px 10px', fontSize: 11, fontWeight: 600,
    }}>✓ Certified</span>
  ) : null;
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('demands');
  const [demands, setDemands] = useState<BuyerDemand[]>([]);
  const [lots, setLots] = useState<MarketplaceLot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cropFilter, setCropFilter] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');
  const [showCreateDemand, setShowCreateDemand] = useState(false);
  const [demandForm, setDemandForm] = useState({
    crop_name: '', quantity_tonnes: '', required_grade: '',
    harvest_period_start: '', harvest_period_end: '',
    preferred_location: '', state: 'Karnataka',
    min_price_per_qtl: '', max_price_per_qtl: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const isBuyer = user?.role === 'buyer';

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        crop: cropFilter !== 'All' ? cropFilter : undefined,
        state: stateFilter !== 'All' ? stateFilter : undefined,
      };
      if (tab === 'demands') {
        const d = await getMarketplaceDemands(params);
        setDemands(d);
      } else {
        const l = await getMarketplaceLots({
          ...params,
          lot_type: tab === 'future' ? 'FUTURE' : 'STOCK',
        });
        setLots(l);
      }
    } catch {
      setError('Failed to load marketplace data.');
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tab, cropFilter, stateFilter]);

  const handleCreateDemand = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createBuyerDemand({
        crop_name: demandForm.crop_name,
        quantity_tonnes: parseFloat(demandForm.quantity_tonnes),
        required_grade: demandForm.required_grade || undefined,
        harvest_period_start: demandForm.harvest_period_start || undefined,
        harvest_period_end: demandForm.harvest_period_end || undefined,
        preferred_location: demandForm.preferred_location || undefined,
        state: demandForm.state || undefined,
        min_price_per_qtl: demandForm.min_price_per_qtl ? parseFloat(demandForm.min_price_per_qtl) : undefined,
        max_price_per_qtl: demandForm.max_price_per_qtl ? parseFloat(demandForm.max_price_per_qtl) : undefined,
      });
      setShowCreateDemand(false);
      fetchData();
    } catch {
      setError('Failed to create demand.');
    }
    setSubmitting(false);
  };

  const styles = {
    page: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', padding: '32px 24px', fontFamily: "'Inter', sans-serif" } as React.CSSProperties,
    header: { maxWidth: 1100, margin: '0 auto 32px' } as React.CSSProperties,
    title: { fontSize: 32, fontWeight: 800, color: '#f8fafc', marginBottom: 8 } as React.CSSProperties,
    subtitle: { color: '#94a3b8', fontSize: 16 } as React.CSSProperties,
    tabs: { display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' as const },
    tab: (active: boolean): React.CSSProperties => ({
      padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
      fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
      background: active ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : '#1e293b',
      color: active ? '#fff' : '#94a3b8',
      boxShadow: active ? '0 4px 15px rgba(99,102,241,0.4)' : 'none',
    }),
    filters: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' as const } as React.CSSProperties,
    select: { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: 8, padding: '8px 14px', fontSize: 14 } as React.CSSProperties,
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 } as React.CSSProperties,
    card: { background: 'rgba(30,41,59,0.8)', border: '1px solid #334155', borderRadius: 16, padding: 24, backdropFilter: 'blur(10px)' } as React.CSSProperties,
    cardTitle: { fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 4 } as React.CSSProperties,
    label: { color: '#64748b', fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 2 } as React.CSSProperties,
    value: { color: '#e2e8f0', fontSize: 14, marginBottom: 8 } as React.CSSProperties,
    pill: { display: 'inline-block', background: '#1e40af22', color: '#93c5fd', border: '1px solid #1e40af44', borderRadius: 20, padding: '2px 10px', fontSize: 12, marginRight: 6 } as React.CSSProperties,
    btn: { background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' } as React.CSSProperties,
    btnOutline: { background: 'transparent', color: '#6366f1', border: '1px solid #6366f1', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
    priceRange: { color: '#4ade80', fontWeight: 700, fontSize: 16 } as React.CSSProperties,
    modal: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 } as React.CSSProperties,
    modalBox: { background: '#0f172a', border: '1px solid #334155', borderRadius: 20, padding: 36, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' as const } as React.CSSProperties,
    input: { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', width: '100%', fontSize: 14, boxSizing: 'border-box' as const } as React.CSSProperties,
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 } as React.CSSProperties,
    formGroup: { marginBottom: 16 } as React.CSSProperties,
    formLabel: { display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6 } as React.CSSProperties,
  };

  return (
    <div style={styles.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={styles.title}>🏪 Oilseed Marketplace</h1>
            <p style={styles.subtitle}>Connect farmers with verified buyers across Karnataka</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {!isBuyer && (
              <button style={styles.btn} onClick={() => navigate('/my-lots')}>
                📦 My Lots
              </button>
            )}
            {isBuyer && (
              <button style={styles.btn} onClick={() => setShowCreateDemand(true)}>
                + Post Demand
              </button>
            )}
            {!isBuyer && (
              <button style={styles.btn} onClick={() => setShowCreateDemand(true)}>
                + Post Demand
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Tabs */}
        <div style={styles.tabs}>
          {([
            ['demands', '📋 Buyer Demand Board'],
            ['future', '🌱 Future Crop Lots'],
            ['stock', '📦 Available Stock'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button key={t} style={styles.tab(tab === t)} onClick={() => setTab(t)}>{label}</button>
          ))}
        </div>

        {/* Filters */}
        <div style={styles.filters}>
          <span style={{ color: '#64748b', fontSize: 13 }}>Filter:</span>
          <select style={styles.select} value={cropFilter} onChange={e => setCropFilter(e.target.value)}>
            {CROPS.map(c => <option key={c}>{c}</option>)}
          </select>
          <select style={styles.select} value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
            {STATES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button style={styles.btnOutline} onClick={fetchData}>Refresh</button>
        </div>

        {error && <div style={{ color: '#ef4444', marginBottom: 16, padding: 12, background: '#ef444422', borderRadius: 8 }}>{error}</div>}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#6366f1', padding: 48, fontSize: 18 }}>Loading marketplace...</div>
        ) : tab === 'demands' ? (
          <div>
            {demands.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: 48 }}>No open demands found. {isBuyer ? 'Post a demand to get started!' : ''}</div>
            ) : (
              <div style={styles.grid}>
                {demands.map(d => (
                  <div key={d.id} style={{ ...styles.card, borderColor: d.match_score && d.match_score >= 70 ? '#22c55e44' : '#334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={styles.cardTitle}>
                        🌾 {d.crop_name}
                        <MatchBadge score={d.match_score} />
                      </div>
                      <span style={{ ...styles.pill, background: '#0f172a', color: '#94a3b8' }}>DEMAND #{d.id}</span>
                    </div>
                    <div style={styles.label}>Quantity Required</div>
                    <div style={styles.value}><strong>{d.quantity_tonnes} tonnes</strong> {d.required_grade && `· ${d.required_grade}`}</div>
                    <div style={styles.label}>Price Range (per quintal)</div>
                    <div style={styles.priceRange}>₹{d.min_price_per_qtl?.toLocaleString()} – ₹{d.max_price_per_qtl?.toLocaleString()}</div>
                    <div style={{ marginTop: 12 }}>
                      {d.state && <span style={styles.pill}>📍 {d.preferred_location || d.state}</span>}
                      {d.harvest_period_start && <span style={styles.pill}>📅 {d.harvest_period_start} – {d.harvest_period_end}</span>}
                    </div>
                    {d.match_reasons && d.match_reasons.length > 0 && (
                      <div style={{ marginTop: 12, padding: '8px 12px', background: '#22c55e11', borderRadius: 8, borderLeft: '3px solid #22c55e' }}>
                        {d.match_reasons.map((r, i) => <div key={i} style={{ color: '#86efac', fontSize: 12 }}>✓ {r}</div>)}
                      </div>
                    )}
                    <div style={{ marginTop: 10, color: '#64748b', fontSize: 12, fontStyle: 'italic' }}>
                      ⚠ Indicative requirement — not a guaranteed purchase.
                    </div>
                    <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>By: {d.buyer_username}</div>
                    {!isBuyer && (
                      <button style={{ ...styles.btn, marginTop: 14, width: '100%' }}
                        onClick={() => navigate(`/farmer/demands/${d.id}`)}>
                        🔍 View Demand & Farm Suitability →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {lots.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: 48 }}>No lots available.</div>
            ) : (
              <div style={styles.grid}>
                {lots.map(lot => (
                  <div key={`${lot.lot_type}-${lot.id}`} style={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={styles.cardTitle}>🌾 {lot.crop_name}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ ...styles.pill, background: lot.lot_type === 'FUTURE' ? '#1e40af22' : '#7c3aed22', color: lot.lot_type === 'FUTURE' ? '#93c5fd' : '#c4b5fd' }}>
                          {lot.lot_type === 'FUTURE' ? '🌱 Future' : '📦 Stock'}
                        </span>
                        <VerifiedBadge has={lot.has_certificate} />
                      </div>
                    </div>
                    <div style={styles.label}>Quantity</div>
                    <div style={styles.value}><strong>{lot.quantity} {lot.quantity_unit}</strong> {lot.grade && `· ${lot.grade}`}</div>
                    {lot.harvest_period && (
                      <>
                        <div style={styles.label}>Harvest Period</div>
                        <div style={styles.value}>{lot.harvest_period}</div>
                      </>
                    )}
                    <div style={{ marginTop: 10 }}>
                      {lot.state && <span style={styles.pill}>📍 {lot.location || lot.state}</span>}
                    </div>
                    <div style={{ marginTop: 12, color: '#64748b', fontSize: 12 }}>By: {lot.farmer_username}</div>
                    {isBuyer && (
                      <button style={{ ...styles.btn, marginTop: 14, width: '100%' }}
                        onClick={() => navigate(`/auction-lot/${lot.lot_type.toLowerCase() === 'future' ? 'future' : 'stock'}/${lot.id}`)}>
                        💰 View Auction & Bid →
                      </button>
                    )}
                    {!isBuyer && (
                      <button style={{ ...styles.btnOutline, marginTop: 14, width: '100%' }}
                        onClick={() => navigate(`/auction-lot/${lot.lot_type.toLowerCase() === 'future' ? 'future' : 'stock'}/${lot.id}`)}>
                        📊 View Lot & Bids →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Demand Modal */}
      {showCreateDemand && (
        <div style={styles.modal} onClick={e => e.target === e.currentTarget && setShowCreateDemand(false)}>
          <div style={styles.modalBox}>
            <h2 style={{ color: '#f8fafc', fontWeight: 800, marginBottom: 24, fontSize: 22 }}>📋 Post a Buyer Demand</h2>
            <form onSubmit={handleCreateDemand}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Crop Name *</label>
                <select style={styles.input} value={demandForm.crop_name}
                  onChange={e => setDemandForm(f => ({ ...f, crop_name: e.target.value }))} required>
                  <option value="">Select crop</option>
                  {CROPS.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ ...styles.formRow, marginBottom: 0 }}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Quantity (tonnes) *</label>
                  <input style={styles.input} type="number" min="0.1" step="0.1"
                    value={demandForm.quantity_tonnes}
                    onChange={e => setDemandForm(f => ({ ...f, quantity_tonnes: e.target.value }))} required />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Required Grade</label>
                  <input style={styles.input} placeholder="Grade A / Grade B"
                    value={demandForm.required_grade}
                    onChange={e => setDemandForm(f => ({ ...f, required_grade: e.target.value }))} />
                </div>
              </div>
              <div style={{ ...styles.formRow, marginBottom: 0 }}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Harvest Period Start</label>
                  <input style={styles.input} placeholder="Nov 2026"
                    value={demandForm.harvest_period_start}
                    onChange={e => setDemandForm(f => ({ ...f, harvest_period_start: e.target.value }))} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Harvest Period End</label>
                  <input style={styles.input} placeholder="Dec 2026"
                    value={demandForm.harvest_period_end}
                    onChange={e => setDemandForm(f => ({ ...f, harvest_period_end: e.target.value }))} />
                </div>
              </div>
              <div style={{ ...styles.formRow, marginBottom: 0 }}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Preferred Location</label>
                  <input style={styles.input} placeholder="Tumkur, Dharwad..."
                    value={demandForm.preferred_location}
                    onChange={e => setDemandForm(f => ({ ...f, preferred_location: e.target.value }))} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>State</label>
                  <select style={styles.input} value={demandForm.state}
                    onChange={e => setDemandForm(f => ({ ...f, state: e.target.value }))}>
                    {STATES.filter(s => s !== 'All').map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ ...styles.formRow, marginBottom: 0 }}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Min Price/qtl (₹)</label>
                  <input style={styles.input} type="number" placeholder="5000"
                    value={demandForm.min_price_per_qtl}
                    onChange={e => setDemandForm(f => ({ ...f, min_price_per_qtl: e.target.value }))} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Max Price/qtl (₹)</label>
                  <input style={styles.input} type="number" placeholder="6000"
                    value={demandForm.max_price_per_qtl}
                    onChange={e => setDemandForm(f => ({ ...f, max_price_per_qtl: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="submit" style={{ ...styles.btn, flex: 1 }} disabled={submitting}>
                  {submitting ? 'Posting...' : 'Post Demand'}
                </button>
                <button type="button" style={{ ...styles.btnOutline, flex: 1 }} onClick={() => setShowCreateDemand(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
