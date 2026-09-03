import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getFutureLot, getAuctionByLot, openAuction, placeBid,
  acceptBid, getContactSharing, setContactSharingPermission,
} from '../services/api';
import type { FutureLot, Auction, Bid, ContactSharingStatus } from '../types/api';

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    OPEN: { bg: '#22c55e22', color: '#22c55e' },
    ACCEPTED: { bg: '#6366f122', color: '#818cf8' },
    CLOSED: { bg: '#94a3b822', color: '#94a3b8' },
    PENDING: { bg: '#f59e0b22', color: '#f59e0b' },
    REJECTED: { bg: '#ef444422', color: '#ef4444' },
    SHARED: { bg: '#22c55e22', color: '#22c55e' },
    DECLINED: { bg: '#ef444422', color: '#ef4444' },
  };
  const c = map[status] || { bg: '#94a3b822', color: '#94a3b8' };
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}55`, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
      {status}
    </span>
  );
}

function BestBadge() {
  return (
    <span style={{ background: 'linear-gradient(90deg,#f59e0b,#f97316)', color: '#fff', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 800 }}>
      ⭐ BEST OFFER
    </span>
  );
}

// ── Smart Comparison ──────────────────────────────────────────────────────────

function findBestBid(bids: Bid[]): number | null {
  const pending = bids.filter(b => b.status === 'PENDING');
  if (!pending.length) return null;
  let best = pending[0];
  for (const b of pending) {
    const eff = (b.effective_price_per_qtl ?? b.bid_price_per_qtl);
    const bestEff = (best.effective_price_per_qtl ?? best.bid_price_per_qtl);
    if (eff > bestEff) best = b;
  }
  return best.id;
}

function getBidReasons(bid: Bid, allBids: Bid[]): string[] {
  const reasons: string[] = [];
  const eff = bid.effective_price_per_qtl ?? bid.bid_price_per_qtl;
  const maxEff = Math.max(...allBids.map(b => b.effective_price_per_qtl ?? b.bid_price_per_qtl));

  if (eff === maxEff) reasons.push('Highest effective price after transport');
  if ((bid.transport_cost_per_qtl ?? 0) === Math.min(...allBids.map(b => b.transport_cost_per_qtl ?? 0))) {
    reasons.push('Lowest transport cost');
  }
  if (bid.quantity_tonnes) reasons.push(`Quantity matches lot (${bid.quantity_tonnes}t)`);
  if (bid.required_grade) reasons.push(`Grade specified: ${bid.required_grade}`);
  return reasons;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AuctionLotPage() {
  const { lotType, lotId } = useParams<{ lotType: string; lotId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lot, setLot] = useState<FutureLot | null>(null);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [auctionLoading, setAuctionLoading] = useState(false);

  // Bid form state (for buyers)
  const [showBidForm, setShowBidForm] = useState(false);
  const [bidForm, setBidForm] = useState({
    bid_price_per_qtl: '',
    quantity_tonnes: '',
    required_grade: '',
    transport_cost_per_qtl: '0',
    quality_conditions: '',
    additional_conditions: '',
  });
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [bidSuccess, setBidSuccess] = useState('');
  const [bidError, setBidError] = useState('');

  // Acceptance state (for farmers)
  const [acceptingBidId, setAcceptingBidId] = useState<number | null>(null);
  const [acceptResult, setAcceptResult] = useState<any>(null);
  const [acceptConfirm, setAcceptConfirm] = useState(false);

  // Contact sharing
  const [contactStatus, setContactStatus] = useState<ContactSharingStatus | null>(null);
  const [contactLoading, setContactLoading] = useState(false);

  const isFarmer = user?.role === 'farmer';
  const isBuyer = user?.role === 'buyer';
  const lotTypeNormalized = (lotType || 'future').toUpperCase().replace(/-/g, '_');
  const lotIdNum = parseInt(lotId || '0');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Load lot details
      if (lotTypeNormalized === 'FUTURE_CROP' || lotType === 'future') {
        const l = await getFutureLot(lotIdNum);
        setLot(l);
      }
      // Load existing auction if any
      const existingAuction = await getAuctionByLot(lotType || 'future', lotIdNum);
      setAuction(existingAuction);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load lot details.');
    }
    setLoading(false);
  }, [lotType, lotId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load contact sharing status for accepted bid
  useEffect(() => {
    if (!acceptResult?.bid_id) return;
    const fetchContact = async () => {
      try {
        const cs = await getContactSharing(acceptResult.bid_id);
        setContactStatus(cs);
      } catch { /* no sharing record yet */ }
    };
    fetchContact();
  }, [acceptResult]);

  const handleOpenAuction = async () => {
    if (!lot) return;
    setAuctionLoading(true);
    setError('');
    try {
      const newAuction = await openAuction('FUTURE_CROP', lotIdNum);
      setAuction(newAuction);
    } catch (e: any) {
      const detail = e?.response?.data?.detail || 'Failed to open auction.';
      if (detail.includes('already exists')) {
        // Reload to get existing
        await loadData();
      } else {
        setError(detail);
      }
    }
    setAuctionLoading(false);
  };

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auction) return;
    setBidSubmitting(true);
    setBidError('');
    try {
      await placeBid(auction.id, {
        bid_price_per_qtl: parseFloat(bidForm.bid_price_per_qtl),
        quantity_tonnes: bidForm.quantity_tonnes ? parseFloat(bidForm.quantity_tonnes) : undefined,
        required_grade: bidForm.required_grade || undefined,
        transport_cost_per_qtl: bidForm.transport_cost_per_qtl ? parseFloat(bidForm.transport_cost_per_qtl) : 0,
        quality_conditions: bidForm.quality_conditions || undefined,
        additional_conditions: bidForm.additional_conditions || undefined,
      });
      setBidSuccess('Your indicative bid has been submitted successfully.');
      setShowBidForm(false);
      await loadData();
    } catch (e: any) {
      setBidError(e?.response?.data?.detail || 'Failed to place bid.');
    }
    setBidSubmitting(false);
  };

  const handleAcceptBid = async () => {
    if (!acceptingBidId) return;
    setAuctionLoading(true);
    setError('');
    try {
      const result = await acceptBid(acceptingBidId);
      setAcceptResult(result);
      setAcceptConfirm(false);
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to accept bid.');
    }
    setAuctionLoading(false);
  };

  const handleContactPermission = async (allow: boolean) => {
    if (!acceptResult?.bid_id) return;
    setContactLoading(true);
    try {
      const cs = await setContactSharingPermission(acceptResult.bid_id, allow);
      setContactStatus(cs);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to set permission.');
    }
    setContactLoading(false);
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const s = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      padding: '32px 24px',
      fontFamily: "'Inter', sans-serif",
    } as React.CSSProperties,
    wrap: { maxWidth: 900, margin: '0 auto' } as React.CSSProperties,
    card: {
      background: 'rgba(30,41,59,0.85)',
      border: '1px solid #334155',
      borderRadius: 20,
      padding: 28,
      marginBottom: 24,
      backdropFilter: 'blur(10px)',
    } as React.CSSProperties,
    h1: { fontSize: 28, fontWeight: 800, color: '#f8fafc', marginBottom: 8 } as React.CSSProperties,
    h2: { fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 16 } as React.CSSProperties,
    label: { color: '#64748b', fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 4 } as React.CSSProperties,
    value: { color: '#e2e8f0', fontSize: 15, marginBottom: 12 } as React.CSSProperties,
    priceGreen: { color: '#4ade80', fontWeight: 800, fontSize: 20 } as React.CSSProperties,
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
      padding: '11px 22px',
      fontWeight: 700,
      fontSize: 14,
      cursor: 'pointer',
      transition: 'opacity 0.2s',
    } as React.CSSProperties,
    btnGreen: {
      background: 'linear-gradient(90deg, #22c55e, #16a34a)',
      color: '#fff',
      border: 'none',
      borderRadius: 10,
      padding: '11px 22px',
      fontWeight: 700,
      fontSize: 14,
      cursor: 'pointer',
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
    btnDanger: {
      background: 'transparent',
      color: '#ef4444',
      border: '1px solid #ef4444',
      borderRadius: 10,
      padding: '10px 20px',
      fontWeight: 600,
      fontSize: 14,
      cursor: 'pointer',
    } as React.CSSProperties,
    input: {
      background: '#1e293b',
      color: '#f8fafc',
      border: '1px solid #334155',
      borderRadius: 8,
      padding: '10px 14px',
      width: '100%',
      fontSize: 14,
      boxSizing: 'border-box' as const,
    } as React.CSSProperties,
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 } as React.CSSProperties,
    formGroup: { marginBottom: 16 } as React.CSSProperties,
    formLabel: { display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6 } as React.CSSProperties,
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
    bidCard: (isBest: boolean) => ({
      background: isBest ? 'rgba(99,102,241,0.12)' : 'rgba(15,23,42,0.6)',
      border: `1px solid ${isBest ? '#6366f155' : '#334155'}`,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    }) as React.CSSProperties,
    modal: {
      position: 'fixed' as const,
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    } as React.CSSProperties,
    modalBox: {
      background: '#0f172a',
      border: '1px solid #334155',
      borderRadius: 20,
      padding: 36,
      width: '100%',
      maxWidth: 520,
      maxHeight: '90vh',
      overflowY: 'auto' as const,
    } as React.CSSProperties,
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={s.page}>
        <div style={{ textAlign: 'center', color: '#6366f1', padding: 80, fontSize: 18 }}>
          🔄 Loading lot details...
        </div>
      </div>
    );
  }

  if (error && !lot) {
    return (
      <div style={s.page}>
        <div style={{ textAlign: 'center', color: '#ef4444', padding: 80 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div>{error}</div>
          <button style={{ ...s.btn, marginTop: 24 }} onClick={() => navigate(-1)}>← Go Back</button>
        </div>
      </div>
    );
  }

  const bestBidId = auction?.bids ? findBestBid(auction.bids) : null;
  const myBid = auction?.bids?.find(b => b.buyer_id === user?.id);
  const isFarmerOwner = lot && user?.id === (lot as any).farmer_id;

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={s.wrap}>

        {/* Back */}
        <button style={{ ...s.btnOutline, marginBottom: 24 }} onClick={() => navigate(-1)}>← Back</button>

        {/* Lot Details */}
        {lot && (
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 6 }}>🌱 FUTURE CROP — PRE-SOWING</div>
                <h1 style={s.h1}>🌾 {lot.crop_name}</h1>
                <div style={{ color: '#64748b', fontSize: 14 }}>By: {lot.farmer_username || 'Farmer'}</div>
              </div>
              <StatusBadge status={lot.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <div style={s.label}>Expected Quantity</div>
                <div style={s.value}><strong>{lot.expected_quantity_tonnes || '—'} tonnes</strong></div>
              </div>
              <div>
                <div style={s.label}>Expected Grade</div>
                <div style={s.value}>{lot.expected_grade || '—'}</div>
              </div>
              <div>
                <div style={s.label}>Harvest Period</div>
                <div style={s.value}>{lot.expected_harvest_start || '—'} {lot.expected_harvest_end ? `– ${lot.expected_harvest_end}` : ''}</div>
              </div>
              <div>
                <div style={s.label}>Land Area</div>
                <div style={s.value}>{lot.land_area_acre ? `${lot.land_area_acre} acres` : '—'}</div>
              </div>
              <div>
                <div style={s.label}>Location</div>
                <div style={s.value}>{lot.location || lot.state || '—'}</div>
              </div>
            </div>
            {lot.description && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: '#1e293b', borderRadius: 10, color: '#94a3b8', fontSize: 14 }}>
                {lot.description}
              </div>
            )}

            <div style={{ marginTop: 16, ...s.alert('info') }}>
              ℹ️ <strong>Future Crop</strong> — This is planned production before sowing. Quantity, grade, and harvest date are expected estimates, not guarantees.
            </div>
          </div>
        )}

        {/* Errors */}
        {error && <div style={{ ...s.alert('error'), marginBottom: 16 }}>⚠️ {error}</div>}
        {bidSuccess && <div style={{ ...s.alert('success'), marginBottom: 16 }}>✓ {bidSuccess}</div>}

        {/* ── FARMER VIEW ─────────────────────────────────────────────────── */}
        {isFarmerOwner && (
          <div style={s.card}>
            <h2 style={s.h2}>Auction Management</h2>

            {!auction ? (
              <div>
                <p style={{ color: '#94a3b8', marginBottom: 16 }}>
                  Open this lot for buyer interest. Buyers will be able to place indicative bids.
                </p>
                <button style={s.btnGreen} onClick={handleOpenAuction} disabled={auctionLoading}>
                  {auctionLoading ? 'Opening...' : '🔔 Open for Buyer Interest'}
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ color: '#f8fafc', fontWeight: 600 }}>Auction Status:</div>
                  <StatusBadge status={auction.status} />
                  <div style={{ color: '#64748b', fontSize: 13 }}>ID #{auction.id}</div>
                </div>

                {/* Accepted result */}
                {acceptResult && (
                  <div style={{ ...s.alert('success'), marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>🤝 Indicative Offer Accepted</div>
                    <div>Buyer: <strong>{acceptResult.buyer_username}</strong></div>
                    <div>Price: <strong>₹{acceptResult.bid_price_per_qtl?.toLocaleString()}/qtl</strong></div>
                    <div>Effective: <strong>₹{acceptResult.effective_price_per_qtl?.toLocaleString()}/qtl</strong></div>
                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>{acceptResult.disclaimer}</div>
                  </div>
                )}

                {/* Contact Sharing Section */}
                {acceptResult && (
                  <div style={{ ...s.card, background: 'rgba(99,102,241,0.1)', border: '1px solid #6366f133', marginBottom: 20 }}>
                    <h2 style={{ ...s.h2, fontSize: 17 }}>📞 Contact Sharing</h2>
                    {contactStatus?.status === 'SHARED' ? (
                      <div>
                        <div style={{ ...s.alert('success') }}>✓ Contact information has been mutually shared.</div>
                        <div style={{ color: '#f8fafc', marginBottom: 8 }}>
                          <strong>Buyer Contact:</strong> {contactStatus.buyer_contact?.username} · {contactStatus.buyer_contact?.email}
                        </div>
                      </div>
                    ) : contactStatus?.status === 'DECLINED' ? (
                      <div style={s.alert('error')}>Contact sharing was declined by one or both parties.</div>
                    ) : (
                      <div>
                        <p style={{ color: '#94a3b8', marginBottom: 16 }}>
                          Would you like to share your contact information with this buyer?
                          Contact details are only exchanged when <strong>both parties</strong> agree.
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <button style={s.btnGreen} onClick={() => handleContactPermission(true)} disabled={contactLoading}>
                            ✓ Allow Contact Sharing
                          </button>
                          <button style={s.btnDanger} onClick={() => handleContactPermission(false)} disabled={contactLoading}>
                            ✗ Decline
                          </button>
                        </div>
                        {contactStatus && (
                          <div style={{ marginTop: 12, color: '#64748b', fontSize: 12 }}>
                            Your permission: {contactStatus.farmer_permission ? '✓ Allowed' : 'Pending'} ·
                            Buyer's permission: {contactStatus.buyer_permission ? '✓ Allowed' : 'Pending'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Bids */}
                <h2 style={{ ...s.h2, marginTop: 8 }}>
                  Buyer Offers
                  <span style={{ marginLeft: 10, background: '#334155', color: '#94a3b8', borderRadius: 20, padding: '2px 10px', fontSize: 13 }}>
                    {auction.bids?.length || 0}
                  </span>
                </h2>

                {!auction.bids?.length ? (
                  <div style={{ color: '#64748b', padding: '24px 0' }}>No bids received yet. Share your lot link to attract buyers.</div>
                ) : (
                  <>
                    <div style={{ ...s.alert('info'), marginBottom: 20 }}>
                      💡 <strong>Smart Comparison</strong> — Effective Price = Bid Price − Transport Cost. Higher effective price = better offer for you.
                    </div>
                    {auction.bids.map(bid => {
                      const isBest = bid.id === bestBidId && bid.status === 'PENDING';
                      const reasons = getBidReasons(bid, auction.bids);
                      return (
                        <div key={bid.id} style={s.bidCard(isBest)}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div>
                              <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: 17, marginBottom: 4 }}>
                                {bid.buyer_username || `Buyer #${bid.buyer_id}`}
                                {isBest && <span style={{ marginLeft: 10 }}><BestBadge /></span>}
                              </div>
                              <StatusBadge status={bid.status} />
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={s.priceGreen}>₹{bid.bid_price_per_qtl?.toLocaleString()}/qtl</div>
                              {(bid.transport_cost_per_qtl ?? 0) > 0 && (
                                <div style={{ color: '#ef4444', fontSize: 12 }}>− ₹{bid.transport_cost_per_qtl} transport</div>
                              )}
                              <div style={{ color: '#4ade80', fontWeight: 700 }}>
                                Effective: ₹{bid.effective_price_per_qtl?.toLocaleString()}/qtl
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                            <div>
                              <div style={s.label}>Quantity</div>
                              <div style={{ color: '#e2e8f0', fontSize: 14 }}>{bid.quantity_tonnes ? `${bid.quantity_tonnes}t` : '—'}</div>
                            </div>
                            <div>
                              <div style={s.label}>Grade</div>
                              <div style={{ color: '#e2e8f0', fontSize: 14 }}>{bid.required_grade || '—'}</div>
                            </div>
                            <div>
                              <div style={s.label}>Conditions</div>
                              <div style={{ color: '#e2e8f0', fontSize: 12 }}>{bid.quality_conditions || bid.additional_conditions || '—'}</div>
                            </div>
                          </div>

                          {isBest && reasons.length > 0 && (
                            <div style={{ background: '#22c55e11', borderLeft: '3px solid #22c55e', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
                              <div style={{ color: '#86efac', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Why this is the best overall offer:</div>
                              {reasons.map((r, i) => <div key={i} style={{ color: '#86efac', fontSize: 12 }}>✓ {r}</div>)}
                            </div>
                          )}

                          {bid.status === 'PENDING' && auction.status === 'OPEN' && (
                            <button
                              style={{ ...s.btnGreen, marginTop: 8 }}
                              onClick={() => { setAcceptingBidId(bid.id); setAcceptConfirm(true); }}
                            >
                              ✓ Accept Indicative Offer
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── BUYER VIEW ──────────────────────────────────────────────────── */}
        {isBuyer && (
          <div style={s.card}>
            <h2 style={s.h2}>Place Indicative Bid</h2>

            <div style={s.alert('warning')}>
              ⚠️ <strong>Indicative Bid</strong> — An indicative bid represents buyer interest and does not automatically create a legally binding purchase contract.
            </div>

            {!auction ? (
              <div style={{ color: '#64748b', padding: '16px 0' }}>
                This lot is not yet open for bidding. The farmer must first open it for buyer interest.
              </div>
            ) : auction.status !== 'OPEN' ? (
              <div style={s.alert('info')}>
                This auction is {auction.status}. No further bids are being accepted.
              </div>
            ) : myBid ? (
              <div>
                <div style={{ ...s.alert('success') }}>✓ You have already placed an indicative bid on this lot.</div>
                <div style={s.bidCard(false)}>
                  <div style={{ color: '#f8fafc', fontWeight: 700, marginBottom: 8 }}>Your Bid</div>
                  <div style={s.priceGreen}>₹{myBid.bid_price_per_qtl?.toLocaleString()}/qtl</div>
                  <div style={{ color: '#94a3b8', marginTop: 4 }}>
                    Effective: ₹{myBid.effective_price_per_qtl?.toLocaleString()}/qtl ·
                    Qty: {myBid.quantity_tonnes || '—'}t ·
                    Grade: {myBid.required_grade || '—'}
                  </div>
                  <div style={{ marginTop: 8 }}><StatusBadge status={myBid.status} /></div>

                  {myBid.status === 'ACCEPTED' && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ ...s.alert('success') }}>🎉 Your bid was accepted by the farmer!</div>
                      <button
                        style={{ ...s.btn, marginTop: 8 }}
                        onClick={() => navigate(`/contact-sharing/${myBid.id}`)}
                      >
                        📞 Manage Contact Sharing →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {!showBidForm ? (
                  <button style={s.btn} onClick={() => setShowBidForm(true)}>
                    💰 Place Indicative Bid
                  </button>
                ) : (
                  <form onSubmit={handlePlaceBid}>
                    {bidError && <div style={{ ...s.alert('error'), marginBottom: 16 }}>{bidError}</div>}
                    <div style={s.formRow}>
                      <div style={s.formGroup}>
                        <label style={s.formLabel}>Bid Price per quintal (₹) *</label>
                        <input
                          style={s.input}
                          type="number"
                          min="1"
                          placeholder="e.g. 6300"
                          value={bidForm.bid_price_per_qtl}
                          onChange={e => setBidForm(f => ({ ...f, bid_price_per_qtl: e.target.value }))}
                          required
                        />
                      </div>
                      <div style={s.formGroup}>
                        <label style={s.formLabel}>Quantity (tonnes)</label>
                        <input
                          style={s.input}
                          type="number"
                          min="0.1"
                          step="0.1"
                          placeholder={lot?.expected_quantity_tonnes?.toString() || 'e.g. 4'}
                          value={bidForm.quantity_tonnes}
                          onChange={e => setBidForm(f => ({ ...f, quantity_tonnes: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div style={s.formRow}>
                      <div style={s.formGroup}>
                        <label style={s.formLabel}>Required Grade</label>
                        <input
                          style={s.input}
                          placeholder="Grade A / Grade B"
                          value={bidForm.required_grade}
                          onChange={e => setBidForm(f => ({ ...f, required_grade: e.target.value }))}
                        />
                      </div>
                      <div style={s.formGroup}>
                        <label style={s.formLabel}>Transport Cost per quintal (₹)</label>
                        <input
                          style={s.input}
                          type="number"
                          min="0"
                          placeholder="0"
                          value={bidForm.transport_cost_per_qtl}
                          onChange={e => setBidForm(f => ({ ...f, transport_cost_per_qtl: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.formLabel}>Quality Conditions (optional)</label>
                      <input
                        style={s.input}
                        placeholder="If Grade A → ₹6300, If Grade B → ₹5900"
                        value={bidForm.quality_conditions}
                        onChange={e => setBidForm(f => ({ ...f, quality_conditions: e.target.value }))}
                      />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.formLabel}>Additional Conditions (optional)</label>
                      <input
                        style={s.input}
                        placeholder="Any other terms or conditions"
                        value={bidForm.additional_conditions}
                        onChange={e => setBidForm(f => ({ ...f, additional_conditions: e.target.value }))}
                      />
                    </div>

                    {bidForm.bid_price_per_qtl && (
                      <div style={{ ...s.alert('info'), marginBottom: 16 }}>
                        Effective Price: ₹{(parseFloat(bidForm.bid_price_per_qtl || '0') - parseFloat(bidForm.transport_cost_per_qtl || '0')).toLocaleString()}/qtl
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 12 }}>
                      <button type="submit" style={{ ...s.btn, flex: 1 }} disabled={bidSubmitting}>
                        {bidSubmitting ? 'Submitting...' : '💰 Submit Indicative Bid'}
                      </button>
                      <button type="button" style={{ ...s.btnOutline }} onClick={() => setShowBidForm(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        )}

        {/* Accept Confirmation Modal */}
        {acceptConfirm && acceptingBidId && (
          <div style={s.modal} onClick={e => e.target === e.currentTarget && setAcceptConfirm(false)}>
            <div style={s.modalBox}>
              <h2 style={{ color: '#f8fafc', fontWeight: 800, marginBottom: 20, fontSize: 22 }}>
                🤝 Confirm Indicative Offer Acceptance
              </h2>

              {auction?.bids?.find(b => b.id === acceptingBidId) && (() => {
                const bid = auction.bids.find(b => b.id === acceptingBidId)!;
                return (
                  <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                    <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Buyer</div>
                    <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: 18, marginBottom: 12 }}>{bid.buyer_username}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <div style={s.label}>Bid Price</div>
                        <div style={{ color: '#4ade80', fontWeight: 700 }}>₹{bid.bid_price_per_qtl?.toLocaleString()}/qtl</div>
                      </div>
                      <div>
                        <div style={s.label}>Effective Price</div>
                        <div style={{ color: '#4ade80', fontWeight: 700 }}>₹{bid.effective_price_per_qtl?.toLocaleString()}/qtl</div>
                      </div>
                      <div>
                        <div style={s.label}>Quantity</div>
                        <div style={{ color: '#e2e8f0' }}>{bid.quantity_tonnes || '—'}t</div>
                      </div>
                      <div>
                        <div style={s.label}>Status</div>
                        <div style={{ color: '#f59e0b', fontWeight: 600 }}>INDICATIVE ACCEPTED</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ ...s.alert('warning'), marginBottom: 20 }}>
                ⚠️ This acceptance represents buyer/seller interest and does <strong>not</strong> automatically create a legally binding purchase contract.
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button style={{ ...s.btnGreen, flex: 1 }} onClick={handleAcceptBid} disabled={auctionLoading}>
                  {auctionLoading ? 'Processing...' : '✓ Confirm Acceptance'}
                </button>
                <button style={{ ...s.btnDanger, flex: 1 }} onClick={() => setAcceptConfirm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
