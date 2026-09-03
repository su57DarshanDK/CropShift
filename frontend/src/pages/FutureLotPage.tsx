import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  listMyFutureLots, createFutureLot, openAuction,
  listMyStockLots, createStockLot,
  listMyCertificates, getMyFarms,
  listMyAuctions, acceptBid,
} from '../services/api';
import type { FutureLot, StockLot, Certificate, Auction, Bid } from '../types/api';

type Section = 'future' | 'stock' | 'auctions';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    OPEN: { bg: '#22c55e22', color: '#22c55e' },
    ACCEPTED: { bg: '#6366f122', color: '#818cf8' },
    CLOSED: { bg: '#94a3b822', color: '#94a3b8' },
    AVAILABLE: { bg: '#22c55e22', color: '#22c55e' },
    SOLD: { bg: '#f59e0b22', color: '#f59e0b' },
    PENDING: { bg: '#f59e0b22', color: '#f59e0b' },
    REJECTED: { bg: '#ef444422', color: '#ef4444' },
  };
  const c = colors[status] || { bg: '#94a3b822', color: '#94a3b8' };
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}55`, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
      {status}
    </span>
  );
}

export default function FutureLotPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [section, setSection] = useState<Section>('future');
  const [futureLots, setFutureLots] = useState<FutureLot[]>([]);
  const [stockLots, setStockLots] = useState<StockLot[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [acceptingBid, setAcceptingBid] = useState<number | null>(null);
  const [acceptResult, setAcceptResult] = useState<any>(null);

  // Pre-fill from URL params (when coming from DemandDetailPage)
  const prefillCrop = searchParams.get('crop') || '';
  const prefillState = searchParams.get('state') || 'Karnataka';
  const prefillHarvestStart = searchParams.get('harvest_start') || '';
  const prefillHarvestEnd = searchParams.get('harvest_end') || '';
  const fromDemandId = searchParams.get('demand_id');

  const [futureForm, setFutureForm] = useState({
    farm_id: '', crop_name: prefillCrop, land_area_acre: '',
    expected_quantity_tonnes: '', expected_harvest_start: prefillHarvestStart,
    expected_harvest_end: prefillHarvestEnd, expected_grade: '',
    location: '', state: prefillState, description: '',
    certificate_id: '',
  });
  const [stockForm, setStockForm] = useState({
    farm_id: '', crop_name: '', quantity_tonnes: '',
    actual_grade: '', location: '', state: 'Karnataka',
    harvest_date: '', description: '', certificate_id: '',
  });

  // If navigated from a demand, auto-open the create form
  useEffect(() => {
    if (fromDemandId) {
      setShowCreate(true);
      setSection('future');
    }
  }, [fromDemandId]);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [fl, sl, au, ce, fa] = await Promise.all([
        listMyFutureLots(),
        listMyStockLots(),
        listMyAuctions(),
        listMyCertificates(),
        getMyFarms(),
      ]);
      setFutureLots(fl);
      setStockLots(sl);
      setAuctions(au);
      setCerts(ce);
      setFarms(fa);
    } catch {
      setError('Failed to load data.');
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreateFuture = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createFutureLot({
        farm_id: parseInt(futureForm.farm_id),
        crop_name: futureForm.crop_name,
        land_area_acre: futureForm.land_area_acre ? parseFloat(futureForm.land_area_acre) : undefined,
        expected_quantity_tonnes: futureForm.expected_quantity_tonnes ? parseFloat(futureForm.expected_quantity_tonnes) : undefined,
        expected_harvest_start: futureForm.expected_harvest_start || undefined,
        expected_harvest_end: futureForm.expected_harvest_end || undefined,
        expected_grade: futureForm.expected_grade || undefined,
        location: futureForm.location || undefined,
        state: futureForm.state || undefined,
        description: futureForm.description || undefined,
        certificate_id: futureForm.certificate_id ? parseInt(futureForm.certificate_id) : undefined,
      });
      setShowCreate(false);
      fetchAll();
    } catch {
      setError('Failed to create lot.');
    }
  };

  const handleCreateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createStockLot({
        farm_id: stockForm.farm_id ? parseInt(stockForm.farm_id) : undefined,
        crop_name: stockForm.crop_name,
        quantity_tonnes: parseFloat(stockForm.quantity_tonnes),
        actual_grade: stockForm.actual_grade || undefined,
        location: stockForm.location || undefined,
        state: stockForm.state || undefined,
        harvest_date: stockForm.harvest_date || undefined,
        description: stockForm.description || undefined,
        certificate_id: stockForm.certificate_id ? parseInt(stockForm.certificate_id) : undefined,
      });
      setShowCreate(false);
      fetchAll();
    } catch {
      setError('Failed to create stock lot.');
    }
  };

  const handleOpenAuction = async (lotType: string, lotId: number) => {
    try {
      await openAuction(lotType, lotId);
      fetchAll();
    } catch (e: any) {
      setError(e?.message || 'Failed to open auction.');
    }
  };

  const handleAcceptBid = async (bidId: number) => {
    setAcceptingBid(bidId);
    try {
      const result = await acceptBid(bidId);
      setAcceptResult(result);
      fetchAll();
    } catch (e: any) {
      setError(e?.message || 'Failed to accept bid.');
    }
    setAcceptingBid(null);
  };

  const styles = {
    page: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', padding: '32px 24px', fontFamily: "'Inter', sans-serif" } as React.CSSProperties,
    header: { maxWidth: 1100, margin: '0 auto 28px' } as React.CSSProperties,
    title: { fontSize: 30, fontWeight: 800, color: '#f8fafc', marginBottom: 6 } as React.CSSProperties,
    tabs: { display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' as const },
    tab: (active: boolean): React.CSSProperties => ({
      padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
      fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
      background: active ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : '#1e293b',
      color: active ? '#fff' : '#94a3b8',
      boxShadow: active ? '0 4px 15px rgba(99,102,241,0.4)' : 'none',
    }),
    card: { background: 'rgba(30,41,59,0.9)', border: '1px solid #334155', borderRadius: 16, padding: 24, marginBottom: 16 } as React.CSSProperties,
    btn: { background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
    btnGreen: { background: 'linear-gradient(90deg, #22c55e, #16a34a)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
    btnOutline: { background: 'transparent', color: '#6366f1', border: '1px solid #6366f1', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
    label: { color: '#64748b', fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 2 } as React.CSSProperties,
    value: { color: '#e2e8f0', fontSize: 14, marginBottom: 8 } as React.CSSProperties,
    input: { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: 8, padding: '9px 14px', width: '100%', fontSize: 14, boxSizing: 'border-box' as const } as React.CSSProperties,
    modal: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 } as React.CSSProperties,
    modalBox: { background: '#0f172a', border: '1px solid #334155', borderRadius: 20, padding: 36, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' as const } as React.CSSProperties,
    formGroup: { marginBottom: 14 } as React.CSSProperties,
    formLabel: { display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6 } as React.CSSProperties,
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 } as React.CSSProperties,
    bidTable: { width: '100%', borderCollapse: 'collapse' as const, marginTop: 12 } as React.CSSProperties,
    th: { color: '#64748b', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 1, padding: '8px 12px', borderBottom: '1px solid #334155', textAlign: 'left' as const } as React.CSSProperties,
    td: { color: '#e2e8f0', fontSize: 13, padding: '10px 12px', borderBottom: '1px solid #1e293b' } as React.CSSProperties,
  };

  const CROPS = ['Groundnut', 'Mustard', 'Soybean', 'Sunflower', 'Sesame', 'Maize', 'Paddy'];
  const STATES = ['Karnataka', 'Maharashtra', 'Rajasthan', 'Madhya Pradesh', 'Andhra Pradesh'];

  return (
    <div style={styles.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={styles.title}>📦 My Lots & Auctions</h1>
            <p style={{ color: '#94a3b8', fontSize: 15 }}>Manage your pre-sowing lots, stock, and active auctions</p>
          </div>
          <button style={styles.btn} onClick={() => setShowCreate(true)}>+ Create Lot</button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={styles.tabs}>
          {([
            ['future', '🌱 Future Crop Lots'],
            ['stock', '📦 Stock Lots'],
            ['auctions', '🔨 My Auctions'],
          ] as [Section, string][]).map(([s, label]) => (
            <button key={s} style={styles.tab(section === s)} onClick={() => setSection(s)}>{label}</button>
          ))}
        </div>

        {error && <div style={{ color: '#ef4444', marginBottom: 16, padding: 12, background: '#ef444422', borderRadius: 8 }}>{error}</div>}
        {loading ? <div style={{ textAlign: 'center', color: '#6366f1', padding: 48 }}>Loading...</div> : (
          <>
            {section === 'future' && (
              <div>
                {futureLots.length === 0
                  ? <div style={{ textAlign: 'center', color: '#64748b', padding: 48 }}>No future crop lots yet. Create one to list your upcoming harvest!</div>
                  : futureLots.map(lot => {
                    const auction = auctions.find(a => a.lot_type === 'FUTURE_CROP' && a.lot_id === lot.id);
                    return (
                      <div key={lot.id} style={styles.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>🌾 {lot.crop_name}</div>
                          <StatusBadge status={lot.status} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
                          {lot.expected_quantity_tonnes && <div><div style={styles.label}>Expected Quantity</div><div style={styles.value}>{lot.expected_quantity_tonnes} tonnes</div></div>}
                          {lot.expected_grade && <div><div style={styles.label}>Grade</div><div style={styles.value}>{lot.expected_grade}</div></div>}
                          {lot.expected_harvest_start && <div><div style={styles.label}>Harvest Period</div><div style={styles.value}>{lot.expected_harvest_start} – {lot.expected_harvest_end}</div></div>}
                          {lot.location && <div><div style={styles.label}>Location</div><div style={styles.value}>{lot.location}, {lot.state}</div></div>}
                        </div>
                        {lot.certificate_id && <div style={{ color: '#22c55e', fontSize: 12, marginBottom: 8 }}>✓ Certificate Attached (#{lot.certificate_id})</div>}
                        {!auction && lot.status === 'OPEN' && (
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                            <button style={styles.btnGreen} onClick={() => handleOpenAuction('FUTURE_CROP', lot.id)}>
                              🔔 Open for Buyer Interest
                            </button>
                          </div>
                        )}
                        {auction && (
                          <div style={{ marginTop: 12, background: '#1e293b', borderRadius: 10, padding: 16 }}>
                            <div style={{ fontWeight: 700, color: '#818cf8', marginBottom: 8 }}>
                              Auction #{auction.id} — <StatusBadge status={auction.status} />
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>{auction.bids.length} bid(s) received</div>
                            <button
                              style={{ ...styles.btn, fontSize: 13, padding: '8px 18px' }}
                              onClick={() => navigate(`/auction-lot/future/${lot.id}`)}
                            >
                              📊 View Full Auction & Compare Bids →
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {section === 'stock' && (
              <div>
                {stockLots.length === 0
                  ? <div style={{ textAlign: 'center', color: '#64748b', padding: 48 }}>No stock lots yet.</div>
                  : stockLots.map(lot => {
                    const auction = auctions.find(a => a.lot_type === 'STOCK' && a.lot_id === lot.id);
                    return (
                      <div key={lot.id} style={styles.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>📦 {lot.crop_name}</div>
                          <StatusBadge status={lot.status} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
                          <div><div style={styles.label}>Quantity</div><div style={styles.value}>{lot.quantity_tonnes} tonnes</div></div>
                          {lot.actual_grade && <div><div style={styles.label}>Grade</div><div style={styles.value}>{lot.actual_grade}</div></div>}
                          {lot.harvest_date && <div><div style={styles.label}>Harvest Date</div><div style={styles.value}>{lot.harvest_date}</div></div>}
                          {lot.location && <div><div style={styles.label}>Location</div><div style={styles.value}>{lot.location}</div></div>}
                        </div>
                        {!auction && lot.status === 'AVAILABLE' && (
                          <button style={styles.btnGreen} onClick={() => handleOpenAuction('STOCK', lot.id)}>
                            🔨 Open Auction
                          </button>
                        )}
                        {auction && (
                          <div style={{ marginTop: 12, background: '#1e293b', borderRadius: 10, padding: 16 }}>
                            <div style={{ fontWeight: 700, color: '#818cf8', marginBottom: 8 }}>
                              Auction #{auction.id} — <StatusBadge status={auction.status} />
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>{auction.bids.length} bid(s)</div>
                            {auction.bids.length > 0 && (
                              <table style={styles.bidTable}>
                                <thead>
                                  <tr>
                                    <th style={styles.th}>Buyer</th>
                                    <th style={styles.th}>Bid</th>
                                    <th style={styles.th}>Transport</th>
                                    <th style={styles.th}>Effective</th>
                                    <th style={styles.th}>Status</th>
                                    {auction.status === 'OPEN' && <th style={styles.th}>Action</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {auction.bids.map(bid => (
                                    <tr key={bid.id}>
                                      <td style={styles.td}>{bid.buyer_username || `Buyer #${bid.buyer_id}`}</td>
                                      <td style={styles.td}>₹{bid.bid_price_per_qtl.toLocaleString()}</td>
                                      <td style={styles.td}>₹{(bid.transport_cost_per_qtl || 0).toLocaleString()}</td>
                                      <td style={{ ...styles.td, color: '#4ade80', fontWeight: 700 }}>₹{(bid.effective_price_per_qtl || bid.bid_price_per_qtl - (bid.transport_cost_per_qtl || 0)).toLocaleString()}</td>
                                      <td style={styles.td}><StatusBadge status={bid.status} /></td>
                                      {auction.status === 'OPEN' && (
                                        <td style={styles.td}>
                                          {bid.status === 'PENDING' && (
                                            <button style={{ ...styles.btnGreen, padding: '5px 12px', fontSize: 12 }}
                                              disabled={acceptingBid === bid.id}
                                              onClick={() => handleAcceptBid(bid.id)}>
                                              {acceptingBid === bid.id ? '...' : '✓ Accept'}
                                            </button>
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {section === 'auctions' && (
              <div>
                {auctions.length === 0
                  ? <div style={{ textAlign: 'center', color: '#64748b', padding: 48 }}>No auctions yet. Open one from your lots.</div>
                  : auctions.map(a => (
                    <div key={a.id} style={styles.card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                          Auction #{a.id} — {a.lot_type === 'FUTURE_CROP' ? '🌱 Future Crop Lot' : '📦 Stock Lot'} #{a.lot_id}
                        </div>
                        <StatusBadge status={a.status} />
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>{a.bids.length} bid(s) received</div>
                      {a.bids.length > 0 && (
                        <table style={styles.bidTable}>
                          <thead>
                            <tr>
                              <th style={styles.th}>Buyer</th>
                              <th style={styles.th}>Bid Price/qtl</th>
                              <th style={styles.th}>Transport</th>
                              <th style={styles.th}>Effective Offer</th>
                              <th style={styles.th}>Grade Condition</th>
                              <th style={styles.th}>Status</th>
                              {a.status === 'OPEN' && <th style={styles.th}>Action</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {[...a.bids].sort((x, y) => (y.effective_price_per_qtl || 0) - (x.effective_price_per_qtl || 0)).map((bid, idx) => (
                              <tr key={bid.id} style={{ background: idx === 0 && a.status === 'OPEN' ? '#22c55e0a' : undefined }}>
                                <td style={styles.td}>
                                  {idx === 0 && a.status === 'OPEN' && <span style={{ fontSize: 10, color: '#22c55e', marginRight: 4 }}>⭐ BEST</span>}
                                  {bid.buyer_username || `Buyer #${bid.buyer_id}`}
                                </td>
                                <td style={styles.td}>₹{bid.bid_price_per_qtl.toLocaleString()}</td>
                                <td style={styles.td}>₹{(bid.transport_cost_per_qtl || 0).toLocaleString()}</td>
                                <td style={{ ...styles.td, color: '#4ade80', fontWeight: 700 }}>
                                  ₹{(bid.effective_price_per_qtl || bid.bid_price_per_qtl - (bid.transport_cost_per_qtl || 0)).toLocaleString()}
                                </td>
                                <td style={{ ...styles.td, fontSize: 11 }}>{bid.quality_conditions || '—'}</td>
                                <td style={styles.td}><StatusBadge status={bid.status} /></td>
                                {a.status === 'OPEN' && (
                                  <td style={styles.td}>
                                    {bid.status === 'PENDING' && (
                                      <button
                                        style={{ ...styles.btnGreen, padding: '5px 12px', fontSize: 12 }}
                                        disabled={acceptingBid === bid.id}
                                        onClick={() => handleAcceptBid(bid.id)}
                                      >
                                        {acceptingBid === bid.id ? '...' : '✓ Accept'}
                                      </button>
                                    )}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Indicative Acceptance Result */}
      {acceptResult && (
        <div style={styles.modal} onClick={() => setAcceptResult(null)}>
          <div style={{ ...styles.modalBox, textAlign: 'center', maxWidth: 480 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤝</div>
            <h2 style={{ color: '#4ade80', fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Indicative Offer Accepted!</h2>
            <div style={{ color: '#e2e8f0', fontSize: 15, marginBottom: 16 }}>
              <strong>{acceptResult.buyer_username}</strong>'s bid of <strong style={{ color: '#4ade80' }}>₹{acceptResult.effective_price_per_qtl?.toLocaleString()}/qtl</strong> (effective) has been accepted.
            </div>
            <div style={{ background: '#f59e0b11', border: '1px solid #f59e0b44', borderRadius: 10, padding: 14, color: '#fcd34d', fontSize: 12, marginBottom: 20, textAlign: 'left' }}>
              ⚠️ <strong>Disclaimer:</strong> {acceptResult.disclaimer}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
              Both parties can now manage contact sharing permissions.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ ...styles.btn, flex: 1 }} onClick={() => navigate(`/contact-sharing/${acceptResult.bid_id}`)}>
                Manage Contact Sharing →
              </button>
              <button style={{ ...styles.btnOutline, flex: 1 }} onClick={() => setAcceptResult(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Lot Modal */}
      {showCreate && (
        <div style={styles.modal} onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={styles.modalBox}>
            <h2 style={{ color: '#f8fafc', fontWeight: 800, marginBottom: 6, fontSize: 20 }}>Create New Lot</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <button style={section === 'future' ? styles.btn : styles.btnOutline} onClick={() => setSection('future')}>🌱 Future Crop Lot</button>
              <button style={section === 'stock' ? styles.btn : styles.btnOutline} onClick={() => setSection('stock')}>📦 Stock Lot</button>
            </div>

            {section === 'future' ? (
              <form onSubmit={handleCreateFuture}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Farm *</label>
                    <select style={styles.input} value={futureForm.farm_id}
                      onChange={e => setFutureForm(f => ({ ...f, farm_id: e.target.value }))} required>
                      <option value="">Select farm</option>
                      {farms.map((f: any) => <option key={f.id} value={f.id}>Farm #{f.id} — {f.district || 'Unknown'} ({f.land_area_acre}ac)</option>)}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Crop *</label>
                    <select style={styles.input} value={futureForm.crop_name}
                      onChange={e => setFutureForm(f => ({ ...f, crop_name: e.target.value }))} required>
                      <option value="">Select crop</option>
                      {CROPS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Land Area (acres)</label>
                    <input style={styles.input} type="number" step="0.1"
                      value={futureForm.land_area_acre} onChange={e => setFutureForm(f => ({ ...f, land_area_acre: e.target.value }))} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Expected Quantity (tonnes)</label>
                    <input style={styles.input} type="number" step="0.1"
                      value={futureForm.expected_quantity_tonnes} onChange={e => setFutureForm(f => ({ ...f, expected_quantity_tonnes: e.target.value }))} />
                  </div>
                </div>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Harvest Start</label>
                    <input style={styles.input} placeholder="Nov 2026"
                      value={futureForm.expected_harvest_start} onChange={e => setFutureForm(f => ({ ...f, expected_harvest_start: e.target.value }))} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Harvest End</label>
                    <input style={styles.input} placeholder="Dec 2026"
                      value={futureForm.expected_harvest_end} onChange={e => setFutureForm(f => ({ ...f, expected_harvest_end: e.target.value }))} />
                  </div>
                </div>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Expected Grade</label>
                    <input style={styles.input} placeholder="Grade A"
                      value={futureForm.expected_grade} onChange={e => setFutureForm(f => ({ ...f, expected_grade: e.target.value }))} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Certificate</label>
                    <select style={styles.input} value={futureForm.certificate_id}
                      onChange={e => setFutureForm(f => ({ ...f, certificate_id: e.target.value }))}>
                      <option value="">None</option>
                      {certs.filter(c => c.verification_status === 'VERIFIED').map(c => (
                        <option key={c.id} value={c.id}>#{c.id} — {c.crop} ({c.grade}) ✓</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Description</label>
                  <input style={styles.input} placeholder="Brief description of your lot"
                    value={futureForm.description} onChange={e => setFutureForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" style={{ ...styles.btn, flex: 1 }}>Create Future Lot</button>
                  <button type="button" style={{ ...styles.btnOutline, flex: 1 }} onClick={() => setShowCreate(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateStock}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Crop *</label>
                    <select style={styles.input} value={stockForm.crop_name}
                      onChange={e => setStockForm(f => ({ ...f, crop_name: e.target.value }))} required>
                      <option value="">Select crop</option>
                      {CROPS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Quantity (tonnes) *</label>
                    <input style={styles.input} type="number" step="0.1"
                      value={stockForm.quantity_tonnes} onChange={e => setStockForm(f => ({ ...f, quantity_tonnes: e.target.value }))} required />
                  </div>
                </div>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Actual Grade</label>
                    <input style={styles.input} placeholder="Grade A"
                      value={stockForm.actual_grade} onChange={e => setStockForm(f => ({ ...f, actual_grade: e.target.value }))} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Harvest Date</label>
                    <input style={styles.input} placeholder="2026-08-01"
                      value={stockForm.harvest_date} onChange={e => setStockForm(f => ({ ...f, harvest_date: e.target.value }))} />
                  </div>
                </div>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Location</label>
                    <input style={styles.input} value={stockForm.location} onChange={e => setStockForm(f => ({ ...f, location: e.target.value }))} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Certificate</label>
                    <select style={styles.input} value={stockForm.certificate_id}
                      onChange={e => setStockForm(f => ({ ...f, certificate_id: e.target.value }))}>
                      <option value="">None</option>
                      {certs.filter(c => c.verification_status === 'VERIFIED').map(c => (
                        <option key={c.id} value={c.id}>#{c.id} — {c.crop} ✓</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Description</label>
                  <input style={styles.input} value={stockForm.description} onChange={e => setStockForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" style={{ ...styles.btn, flex: 1 }}>Create Stock Lot</button>
                  <button type="button" style={{ ...styles.btnOutline, flex: 1 }} onClick={() => setShowCreate(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
