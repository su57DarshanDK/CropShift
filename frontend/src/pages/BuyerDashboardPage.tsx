import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  listMyDemands, listMyBids, closeBuyerDemand,
  getMarketplaceLots, createBuyerDemand,
} from '../services/api';
import type { BuyerDemand, Bid, MarketplaceLot } from '../types/api';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    OPEN: { bg: '#22c55e22', color: '#22c55e' },
    CLOSED: { bg: '#94a3b822', color: '#94a3b8' },
    PENDING: { bg: '#f59e0b22', color: '#f59e0b' },
    ACCEPTED: { bg: '#6366f122', color: '#818cf8' },
    REJECTED: { bg: '#ef444422', color: '#ef4444' },
  };
  const c = colors[status] || { bg: '#94a3b822', color: '#94a3b8' };
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}55`, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
      {status}
    </span>
  );
}

export default function BuyerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [demands, setDemands] = useState<BuyerDemand[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [lots, setLots] = useState<MarketplaceLot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [d, b, l] = await Promise.all([
        listMyDemands(),
        listMyBids(),
        getMarketplaceLots(),
      ]);
      setDemands(d);
      setBids(b);
      setLots(l);
    } catch {
      setError('Failed to load buyer dashboard.');
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleClose = async (id: number) => {
    try {
      await closeBuyerDemand(id);
      fetchAll();
    } catch {
      setError('Failed to close demand.');
    }
  };

  const acceptedBids = bids.filter(b => b.status === 'ACCEPTED');
  const pendingBids = bids.filter(b => b.status === 'PENDING');

  const styles = {
    page: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', padding: '32px 24px', fontFamily: "'Inter', sans-serif" } as React.CSSProperties,
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 40 } as React.CSSProperties,
    statCard: { background: 'rgba(30,41,59,0.8)', border: '1px solid #334155', borderRadius: 16, padding: 24, backdropFilter: 'blur(10px)' } as React.CSSProperties,
    card: { background: 'rgba(30,41,59,0.9)', border: '1px solid #334155', borderRadius: 16, padding: 24, marginBottom: 16 } as React.CSSProperties,
    section: { marginBottom: 40 } as React.CSSProperties,
    sectionTitle: { fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 } as React.CSSProperties,
    btn: { background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
    btnDanger: { background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 8, padding: '7px 14px', fontWeight: 600, fontSize: 12, cursor: 'pointer' } as React.CSSProperties,
    label: { color: '#64748b', fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 2 } as React.CSSProperties,
    value: { color: '#e2e8f0', fontSize: 14, marginBottom: 8 } as React.CSSProperties,
    priceGreen: { color: '#4ade80', fontWeight: 700, fontSize: 16 } as React.CSSProperties,
    pill: { display: 'inline-block', background: '#1e40af22', color: '#93c5fd', border: '1px solid #1e40af44', borderRadius: 20, padding: '2px 10px', fontSize: 12, marginRight: 6 } as React.CSSProperties,
  };

  return (
    <div style={styles.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#f8fafc', marginBottom: 6 }}>
            🏢 Buyer Dashboard
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 15 }}>
            Welcome, {user?.username}. Manage your demands, track bids, and discover new lots.
          </p>
        </div>

        {/* Stats */}
        <div style={styles.grid}>
          {[
            { icon: '📋', label: 'Active Demands', value: demands.filter(d => d.status === 'OPEN').length, color: '#6366f1' },
            { icon: '💰', label: 'Active Bids', value: pendingBids.length, color: '#f59e0b' },
            { icon: '🤝', label: 'Accepted Offers', value: acceptedBids.length, color: '#22c55e' },
            { icon: '🌾', label: 'Available Lots', value: lots.length, color: '#8b5cf6' },
          ].map(s => (
            <div key={s.label} style={styles.statCard}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
              <div style={{ color: '#94a3b8', fontSize: 14 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {error && <div style={{ color: '#ef4444', marginBottom: 20, padding: 12, background: '#ef444422', borderRadius: 8 }}>{error}</div>}
        {loading ? <div style={{ textAlign: 'center', color: '#6366f1', padding: 48 }}>Loading...</div> : (
          <>
            {/* Accepted Bids */}
            {acceptedBids.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>
                  <span style={{ color: '#4ade80', fontSize: 20 }}>🤝</span>
                  Indicative Offers Accepted
                </div>
                {acceptedBids.map(bid => (
                  <div key={bid.id} style={{ ...styles.card, borderColor: '#22c55e44' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>
                          Bid #{bid.id} — Auction #{bid.auction_id}
                        </div>
                        <div style={styles.label}>Your Bid</div>
                        <div style={styles.priceGreen}>₹{bid.bid_price_per_qtl.toLocaleString()}/qtl (Effective: ₹{bid.effective_price_per_qtl?.toLocaleString()})</div>
                      </div>
                      <StatusBadge status={bid.status} />
                    </div>
                    <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                      <button style={styles.btn} onClick={() => navigate(`/contact-sharing/${bid.id}`)}>
                        📞 Manage Contact Sharing →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* My Demands */}
            <div style={styles.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={styles.sectionTitle}>📋 My Demands</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button style={styles.btn} onClick={() => navigate('/marketplace?tab=post')}>
                    + Post New Demand
                  </button>
                  <button style={{ ...styles.btn, background: 'rgba(99,102,241,0.3)' }} onClick={() => navigate('/marketplace')}>
                    Browse Marketplace
                  </button>
                </div>
              </div>
              {demands.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: 32, background: 'rgba(30,41,59,0.6)', borderRadius: 14 }}>
                  No demands posted yet.
                </div>
              ) : demands.map(d => (
                <div key={d.id} style={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>🌾 {d.crop_name}</div>
                      <div style={styles.label}>Quantity</div>
                      <div style={styles.value}>{d.quantity_tonnes} tonnes {d.required_grade && `· ${d.required_grade}`}</div>
                      <div style={styles.label}>Price Range</div>
                      <div style={{ color: '#4ade80', fontWeight: 700 }}>₹{d.min_price_per_qtl?.toLocaleString()} – ₹{d.max_price_per_qtl?.toLocaleString()}/qtl</div>
                      <div style={{ marginTop: 8 }}>
                        {d.preferred_location && <span style={styles.pill}>📍 {d.preferred_location}</span>}
                        {d.harvest_period_start && <span style={styles.pill}>📅 {d.harvest_period_start}</span>}
                      </div>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                  {d.status === 'OPEN' && (
                    <button style={{ ...styles.btnDanger, marginTop: 14 }} onClick={() => handleClose(d.id)}>
                      Close Demand
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Pending Bids */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>💰 Active Bids</div>
              {pendingBids.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: 32, background: 'rgba(30,41,59,0.6)', borderRadius: 14 }}>
                  No active bids. Browse the marketplace to bid on lots!
                  <button style={{ ...styles.btn, display: 'block', margin: '16px auto 0' }} onClick={() => navigate('/marketplace')}>
                    Browse Lots →
                  </button>
                </div>
              ) : pendingBids.map(bid => (
                <div key={bid.id} style={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>
                        Bid #{bid.id} on Auction #{bid.auction_id}
                      </div>
                      <div style={styles.label}>Bid Price</div>
                      <div style={styles.priceGreen}>₹{bid.bid_price_per_qtl.toLocaleString()}/qtl</div>
                      <div style={styles.label}>Effective (after transport)</div>
                      <div style={styles.value}>₹{(bid.effective_price_per_qtl ?? (bid.bid_price_per_qtl - (bid.transport_cost_per_qtl || 0))).toLocaleString()}/qtl</div>
                      {bid.quality_conditions && (
                        <div style={{ color: '#64748b', fontSize: 12 }}>Conditions: {bid.quality_conditions}</div>
                      )}
                    </div>
                    <StatusBadge status={bid.status} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button style={{ ...styles.btn, fontSize: 12, padding: '7px 14px' }}
                      onClick={() => navigate(`/marketplace`)}
                    >
                      View Auction →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Browse Marketplace */}
            <div style={{ textAlign: 'center', padding: 32, background: 'rgba(30,41,59,0.6)', borderRadius: 20, border: '1px dashed #334155' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏪</div>
              <p style={{ color: '#94a3b8', marginBottom: 16 }}>Discover more future crop lots and stock in the marketplace</p>
              <button style={styles.btn} onClick={() => navigate('/marketplace')}>
                Browse Marketplace →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
