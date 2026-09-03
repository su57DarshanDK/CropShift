import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getContactSharing, setContactSharingPermission } from '../services/api';
import type { ContactSharingStatus } from '../types/api';

export default function ContactSharingPage() {
  const { bidId } = useParams<{ bidId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ContactSharingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchStatus = async () => {
    if (!bidId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getContactSharing(parseInt(bidId));
      setStatus(data);
    } catch {
      setError('Failed to load contact sharing status. You may not have access to this bid.');
    }
    setLoading(false);
  };

  useEffect(() => { fetchStatus(); }, [bidId]);

  const handlePermission = async (allow: boolean) => {
    if (!bidId) return;
    setUpdating(true);
    try {
      const data = await setContactSharingPermission(parseInt(bidId), allow);
      setStatus(data);
    } catch {
      setError('Failed to update permission.');
    }
    setUpdating(false);
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      padding: '32px 24px',
      fontFamily: "'Inter', sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    } as React.CSSProperties,
    card: { background: 'rgba(30,41,59,0.95)', border: '1px solid #334155', borderRadius: 24, padding: 48, maxWidth: 560, width: '100%', textAlign: 'center' as const } as React.CSSProperties,
    btn: { background: 'linear-gradient(90deg, #22c55e, #16a34a)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' } as React.CSSProperties,
    btnDecline: { background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 10, padding: '12px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' } as React.CSSProperties,
    btnNav: { background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' } as React.CSSProperties,
    statusRow: { display: 'flex', justifyContent: 'space-around', margin: '32px 0', gap: 20 } as React.CSSProperties,
    party: { flex: 1, padding: '20px 16px', background: '#1e293b', borderRadius: 14 } as React.CSSProperties,
    partyTitle: { color: '#94a3b8', fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 } as React.CSSProperties,
    partyName: { color: '#f8fafc', fontWeight: 700, fontSize: 15, marginBottom: 12 } as React.CSSProperties,
    check: (allowed: boolean): React.CSSProperties => ({
      fontSize: 32, color: allowed ? '#22c55e' : '#334155',
    }),
    disclaimer: { background: '#f59e0b11', border: '1px solid #f59e0b44', borderRadius: 12, padding: '12px 16px', color: '#fcd34d', fontSize: 12, textAlign: 'left' as const, marginBottom: 28 } as React.CSSProperties,
    contactBox: { background: '#22c55e11', border: '1px solid #22c55e44', borderRadius: 14, padding: 24, marginTop: 24 } as React.CSSProperties,
  };

  const isShared = status?.status === 'SHARED';
  const isDeclined = status?.status === 'DECLINED';

  return (
    <div style={styles.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={styles.card}>
        {loading ? (
          <div style={{ color: '#6366f1', fontSize: 18 }}>Loading...</div>
        ) : error ? (
          <div>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <div style={{ color: '#ef4444', marginBottom: 20 }}>{error}</div>
            <button style={styles.btnNav} onClick={() => navigate('/my-lots')}>Back to My Lots</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🤝</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f8fafc', marginBottom: 8 }}>
              {isShared ? 'Contact Info Shared!' : isDeclined ? 'Sharing Declined' : 'Contact Sharing'}
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 15, marginBottom: 24 }}>
              {isShared
                ? 'Both parties have agreed to share contact information.'
                : isDeclined
                ? 'One or both parties have declined to share contact information.'
                : 'Both parties must allow sharing for contact info to be revealed.'}
            </p>

            <div style={styles.disclaimer}>
              <strong>⚠️ Note:</strong> Sharing contact information is voluntary. CropShift does not guarantee any transaction or contract. This indicative acceptance represents mutual interest only.
            </div>

            <div style={styles.statusRow}>
              <div style={styles.party}>
                <div style={styles.partyTitle}>Farmer</div>
                <div style={styles.partyName}>
                  {isShared && status?.farmer_contact ? status.farmer_contact.username : '🌾 Farmer'}
                </div>
                <div style={styles.check(status?.farmer_permission || false)}>
                  {status?.farmer_permission ? '✓' : '○'}
                </div>
                <div style={{ color: status?.farmer_permission ? '#22c55e' : '#64748b', fontSize: 12, marginTop: 4 }}>
                  {status?.farmer_permission ? 'Allowed' : 'Pending'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', color: '#334155', fontSize: 24 }}>⟷</div>
              <div style={styles.party}>
                <div style={styles.partyTitle}>Buyer</div>
                <div style={styles.partyName}>
                  {isShared && status?.buyer_contact ? status.buyer_contact.username : '🏢 Buyer'}
                </div>
                <div style={styles.check(status?.buyer_permission || false)}>
                  {status?.buyer_permission ? '✓' : '○'}
                </div>
                <div style={{ color: status?.buyer_permission ? '#22c55e' : '#64748b', fontSize: 12, marginTop: 4 }}>
                  {status?.buyer_permission ? 'Allowed' : 'Pending'}
                </div>
              </div>
            </div>

            {isShared && status?.farmer_contact && status?.buyer_contact && (
              <div style={styles.contactBox}>
                <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>✓ Contact Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>FARMER</div>
                    <div style={{ color: '#f8fafc', fontWeight: 600 }}>{status.farmer_contact.username}</div>
                    <div style={{ color: '#94a3b8', fontSize: 13 }}>{status.farmer_contact.email}</div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>BUYER</div>
                    <div style={{ color: '#f8fafc', fontWeight: 600 }}>{status.buyer_contact.username}</div>
                    <div style={{ color: '#94a3b8', fontSize: 13 }}>{status.buyer_contact.email}</div>
                  </div>
                </div>
              </div>
            )}

            {!isShared && !isDeclined && (
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 24 }}>
                <button
                  style={styles.btn}
                  disabled={updating}
                  onClick={() => handlePermission(true)}
                >
                  {updating ? '...' : '✓ Allow Sharing'}
                </button>
                <button
                  style={styles.btnDecline}
                  disabled={updating}
                  onClick={() => handlePermission(false)}
                >
                  ✗ Decline
                </button>
              </div>
            )}

            <button style={{ ...styles.btnNav, marginTop: 24, width: '100%' }} onClick={() => navigate('/my-lots')}>
              ← Back to My Lots
            </button>
          </>
        )}
      </div>
    </div>
  );
}
