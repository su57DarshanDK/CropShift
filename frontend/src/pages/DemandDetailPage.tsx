import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { listBuyerDemands, getMyFarms } from '../services/api';
import type { BuyerDemand } from '../types/api';

export default function DemandDetailPage() {
  const { demandId } = useParams<{ demandId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [demand, setDemand] = useState<BuyerDemand | null>(null);
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch all demands and find the one we want (reuses existing list endpoint)
        const [demandsRes, farmsRes] = await Promise.all([
          listBuyerDemands(),
          getMyFarms(),
        ]);
        const found = demandsRes.find((d: BuyerDemand) => d.id === parseInt(demandId || '0'));
        if (!found) {
          setError('Demand not found or is no longer active.');
        } else {
          setDemand(found);
        }
        setFarms(farmsRes);
      } catch (e: any) {
        setError('Failed to load demand details.');
      }
      setLoading(false);
    };
    load();
  }, [demandId]);

  // Calculate farm suitability for this demand
  function getSuitabilityAnalysis(demand: BuyerDemand, farms: any[]) {
    if (!farms.length) return null;
    const farm = farms[0]; // Use primary farm

    const reasons: string[] = [];
    const issues: string[] = [];
    let score = 0;

    // State match
    if (demand.state && farm.state) {
      if (demand.state.toLowerCase() === farm.state.toLowerCase()) {
        score += 35;
        reasons.push(`Your farm is in ${farm.state} — matches buyer's preferred state`);
      } else {
        issues.push(`Buyer prefers ${demand.state}, your farm is in ${farm.state}`);
      }
    }

    // Location/district match
    if (demand.preferred_location && farm.district) {
      if (demand.preferred_location.toLowerCase().includes(farm.district.toLowerCase())) {
        score += 20;
        reasons.push(`Your district (${farm.district}) is in buyer's preferred location`);
      }
    }

    // Crop check
    try {
      const farmCrop = farm.current_crop?.name || '';
      if (farmCrop && demand.crop_name) {
        if (demand.crop_name.toLowerCase() === farmCrop.toLowerCase()) {
          score += 35;
          reasons.push(`You currently grow ${demand.crop_name} — direct crop match`);
        } else if (farmCrop) {
          issues.push(`You currently grow ${farmCrop}, buyer wants ${demand.crop_name}`);
        }
      } else {
        // No current crop set — crop growth is possible
        score += 10;
        reasons.push(`No conflicting crop — you can plan ${demand.crop_name}`);
      }
    } catch { /* ignore */ }

    // Price viability (rough check using farm area)
    if (demand.max_price_per_qtl && demand.max_price_per_qtl > 4000) {
      score += 10;
      reasons.push(`Attractive price range: up to ₹${demand.max_price_per_qtl?.toLocaleString()}/qtl`);
    }

    const suitable = score >= 40;
    return { score: Math.min(score, 100), reasons, issues, suitable, farm };
  }

  // Build pre-fill URL for create lot
  function buildCreateLotUrl() {
    if (!demand) return '/farmer/my-lots';
    const params = new URLSearchParams({
      demand_id: demand.id.toString(),
      crop: demand.crop_name,
      state: demand.state || '',
      harvest_start: demand.harvest_period_start || '',
      harvest_end: demand.harvest_period_end || '',
    });
    return `/farmer/my-lots?${params.toString()}`;
  }

  const s = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      padding: '32px 24px',
      fontFamily: "'Inter', sans-serif",
    } as React.CSSProperties,
    wrap: { maxWidth: 860, margin: '0 auto' } as React.CSSProperties,
    card: {
      background: 'rgba(30,41,59,0.85)',
      border: '1px solid #334155',
      borderRadius: 20,
      padding: 28,
      marginBottom: 24,
      backdropFilter: 'blur(10px)',
    } as React.CSSProperties,
    h1: { fontSize: 28, fontWeight: 800, color: '#f8fafc', marginBottom: 4 } as React.CSSProperties,
    h2: { fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 16 } as React.CSSProperties,
    label: { color: '#64748b', fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 4 } as React.CSSProperties,
    value: { color: '#e2e8f0', fontSize: 15, marginBottom: 12 } as React.CSSProperties,
    priceGreen: { color: '#4ade80', fontWeight: 800, fontSize: 22 } as React.CSSProperties,
    pill: {
      display: 'inline-block',
      background: '#1e40af22',
      color: '#93c5fd',
      border: '1px solid #1e40af44',
      borderRadius: 20,
      padding: '2px 10px',
      fontSize: 12,
      marginRight: 6,
    } as React.CSSProperties,
    btn: {
      background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
      color: '#fff',
      border: 'none',
      borderRadius: 10,
      padding: '12px 24px',
      fontWeight: 700,
      fontSize: 15,
      cursor: 'pointer',
      width: '100%',
      marginTop: 8,
    } as React.CSSProperties,
    btnOutline: {
      background: 'transparent',
      color: '#6366f1',
      border: '1px solid #6366f1',
      borderRadius: 10,
      padding: '10px 20px',
      fontWeight: 600,
      fontSize: 14,
      cursor: 'pointer',
    } as React.CSSProperties,
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } as React.CSSProperties,
    alert: (type: 'info' | 'warning' | 'success' | 'error') => {
      const colors = {
        info: { bg: '#1e40af22', border: '#3b82f6', color: '#93c5fd' },
        warning: { bg: '#78350f22', border: '#f59e0b', color: '#fcd34d' },
        success: { bg: '#14532d22', border: '#22c55e', color: '#86efac' },
        error: { bg: '#7f1d1d22', border: '#ef4444', color: '#fca5a5' },
      };
      const c = colors[type];
      return {
        background: c.bg,
        borderLeft: `4px solid ${c.border}`,
        borderRadius: 8,
        padding: '12px 16px',
        color: c.color,
        fontSize: 14,
        marginBottom: 16,
      } as React.CSSProperties;
    },
  };

  if (loading) {
    return (
      <div style={s.page}>
        <div style={{ textAlign: 'center', color: '#6366f1', padding: 80, fontSize: 18 }}>🔄 Loading demand details...</div>
      </div>
    );
  }

  if (error || !demand) {
    return (
      <div style={s.page}>
        <div style={{ textAlign: 'center', color: '#ef4444', padding: 80 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div>{error || 'Demand not found.'}</div>
          <button style={{ ...s.btnOutline, marginTop: 24 }} onClick={() => navigate(-1)}>← Back to Market</button>
        </div>
      </div>
    );
  }

  const analysis = getSuitabilityAnalysis(demand, farms);

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={s.wrap}>

        {/* Back */}
        <button style={{ ...s.btnOutline, marginBottom: 24 }} onClick={() => navigate(-1)}>← Back to Market</button>

        {/* Demand Details */}
        <div style={s.card}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ ...s.pill, background: '#1e40af33', color: '#93c5fd' }}>BUYER DEMAND #{demand.id}</span>
            <span style={{ ...s.pill, background: '#22c55e22', color: '#86efac', marginLeft: 4 }}>OPEN</span>
          </div>

          <h1 style={s.h1}>🌾 {demand.crop_name}</h1>
          <div style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>Posted by: {demand.buyer_username || 'Buyer'}</div>

          <div style={{ ...s.alert('info') }}>
            ℹ️ <strong>Indicative requirement</strong> — This is buyer interest only and not a guaranteed purchase.
          </div>

          <div style={s.grid2}>
            <div>
              <div style={s.label}>Required Quantity</div>
              <div style={s.value}><strong>{demand.quantity_tonnes} tonnes</strong></div>
            </div>
            <div>
              <div style={s.label}>Required Grade</div>
              <div style={s.value}>{demand.required_grade || 'Not specified'}</div>
            </div>
            <div>
              <div style={s.label}>Harvest Period</div>
              <div style={s.value}>
                {demand.harvest_period_start
                  ? `${demand.harvest_period_start}${demand.harvest_period_end ? ` – ${demand.harvest_period_end}` : ''}`
                  : 'Not specified'}
              </div>
            </div>
            <div>
              <div style={s.label}>Preferred Location</div>
              <div style={s.value}>{demand.preferred_location || demand.state || 'Not specified'}</div>
            </div>
          </div>

          <div style={{ marginTop: 8, marginBottom: 16 }}>
            <div style={s.label}>Indicative Price Range</div>
            <div style={s.priceGreen}>
              ₹{demand.min_price_per_qtl?.toLocaleString() || '—'} – ₹{demand.max_price_per_qtl?.toLocaleString() || '—'} / quintal
            </div>
          </div>

          {demand.description && (
            <div style={{ background: '#1e293b', borderRadius: 10, padding: '12px 16px', color: '#94a3b8', fontSize: 14 }}>
              {demand.description}
            </div>
          )}
        </div>

        {/* Farm Suitability Analysis */}
        <div style={s.card}>
          <h2 style={s.h2}>🏡 Your Farm Suitability</h2>

          {!farms.length ? (
            <div>
              <div style={s.alert('warning')}>
                ⚠️ You haven't entered your farm details yet. Add your farm to see how well it matches this demand.
              </div>
              <button style={{ ...s.btn, maxWidth: 260 }} onClick={() => navigate('/farmer/farm')}>
                + Enter Farm Details
              </button>
            </div>
          ) : analysis ? (
            <>
              <div style={{
                background: analysis.suitable ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `2px solid ${analysis.suitable ? '#22c55e' : '#ef4444'}`,
                borderRadius: 14,
                padding: 20,
                marginBottom: 20,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>
                  {analysis.suitable ? '✅' : '⚠️'}
                </div>
                <div style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: analysis.suitable ? '#22c55e' : '#ef4444',
                  marginBottom: 8,
                }}>
                  {analysis.suitable
                    ? `${demand.crop_name} appears suitable for your farm`
                    : `${demand.crop_name} may not suit your current farm conditions`}
                </div>
                <div style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: '#f8fafc',
                }}>
                  {analysis.score}% Match
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={s.label}>Your Farm</div>
                  <div style={{ color: '#e2e8f0' }}>{analysis.farm.name || 'Farm'}</div>
                </div>
                <div>
                  <div style={s.label}>Location</div>
                  <div style={{ color: '#e2e8f0' }}>{analysis.farm.district || '—'}, {analysis.farm.state || '—'}</div>
                </div>
                <div>
                  <div style={s.label}>Soil Type</div>
                  <div style={{ color: '#e2e8f0' }}>{analysis.farm.soil_type || '—'}</div>
                </div>
                <div>
                  <div style={s.label}>Water Availability</div>
                  <div style={{ color: '#e2e8f0' }}>{analysis.farm.water_availability || '—'}</div>
                </div>
              </div>

              {analysis.reasons.length > 0 && (
                <div style={{ background: '#22c55e11', borderLeft: '3px solid #22c55e', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
                  {analysis.reasons.map((r, i) => <div key={i} style={{ color: '#86efac', fontSize: 13 }}>✓ {r}</div>)}
                </div>
              )}
              {analysis.issues.length > 0 && (
                <div style={{ background: '#f59e0b11', borderLeft: '3px solid #f59e0b', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
                  {analysis.issues.map((r, i) => <div key={i} style={{ color: '#fcd34d', fontSize: 13 }}>⚠ {r}</div>)}
                </div>
              )}

              {analysis.suitable && (
                <button style={s.btn} onClick={() => navigate(buildCreateLotUrl())}>
                  🌱 Create Future Crop Lot for This Demand →
                </button>
              )}
              {!analysis.suitable && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                  <button style={s.btn} onClick={() => navigate(buildCreateLotUrl())}>
                    🌱 Create Future Crop Lot Anyway →
                  </button>
                  <button style={{ ...s.btnOutline, textAlign: 'center' }} onClick={() => navigate('/farmer/recommendation')}>
                    📊 Check Crop Suitability Tool →
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>

      </div>
    </div>
  );
}
