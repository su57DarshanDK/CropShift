import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function RoleSelectionPage() {
  const navigate = useNavigate();

  const styles = {
    page: {
      minHeight: '85vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
      padding: '40px 20px',
    } as React.CSSProperties,
    container: {
      maxWidth: 960,
      width: '100%',
    } as React.CSSProperties,
    header: {
      textAlign: 'center' as const,
      marginBottom: 44,
    } as React.CSSProperties,
    title: {
      fontSize: 36,
      fontWeight: 800,
      color: '#f8fafc',
      marginBottom: 10,
      letterSpacing: '-0.5px',
    } as React.CSSProperties,
    subtitle: {
      color: '#94a3b8',
      fontSize: 17,
      maxWidth: 600,
      margin: '0 auto',
    } as React.CSSProperties,
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: 28,
    } as React.CSSProperties,
    card: {
      background: 'rgba(30, 41, 59, 0.95)',
      border: '1px solid #334155',
      borderRadius: 24,
      padding: 38,
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'space-between',
      boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    } as React.CSSProperties,
    icon: {
      fontSize: 48,
      marginBottom: 16,
    } as React.CSSProperties,
    cardTitle: {
      fontSize: 28,
      fontWeight: 800,
      color: '#f8fafc',
      marginBottom: 6,
    } as React.CSSProperties,
    cardDesc: {
      color: '#94a3b8',
      fontSize: 15,
      marginBottom: 24,
    } as React.CSSProperties,
    featureList: {
      listStyle: 'none',
      padding: 0,
      margin: '0 0 28px 0',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
    } as React.CSSProperties,
    featureItem: {
      color: '#cbd5e1',
      fontSize: 13,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    } as React.CSSProperties,
    bullet: {
      color: '#22c55e',
      fontWeight: 700,
    } as React.CSSProperties,
    btnPrimary: {
      background: 'linear-gradient(90deg, #22c55e, #16a34a)',
      color: '#fff',
      border: 'none',
      borderRadius: 12,
      padding: '14px 0',
      fontWeight: 700,
      fontSize: 15,
      cursor: 'pointer',
      textAlign: 'center' as const,
      boxShadow: '0 4px 15px rgba(34,197,94,0.3)',
      marginBottom: 10,
      width: '100%',
    } as React.CSSProperties,
    btnBuyerPrimary: {
      background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
      color: '#fff',
      border: 'none',
      borderRadius: 12,
      padding: '14px 0',
      fontWeight: 700,
      fontSize: 15,
      cursor: 'pointer',
      textAlign: 'center' as const,
      boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
      marginBottom: 10,
      width: '100%',
    } as React.CSSProperties,
    btnSecondary: {
      background: 'transparent',
      color: '#4ade80',
      border: '1px solid #22c55e55',
      borderRadius: 12,
      padding: '12px 0',
      fontWeight: 600,
      fontSize: 14,
      cursor: 'pointer',
      textAlign: 'center' as const,
      width: '100%',
    } as React.CSSProperties,
    btnBuyerSecondary: {
      background: 'transparent',
      color: '#818cf8',
      border: '1px solid #6366f155',
      borderRadius: 12,
      padding: '12px 0',
      fontWeight: 600,
      fontSize: 14,
      cursor: 'pointer',
      textAlign: 'center' as const,
      width: '100%',
    } as React.CSSProperties,
  };

  const farmerFeatures = [
    'Crop Recommendation',
    'Buyer Demand',
    'Future Crop Lots',
    'Certificates',
    'Auctions',
    'Profitability',
    'Weather',
    'Schemes',
  ];

  const buyerFeatures = [
    'Post Demand',
    'Future Crop Market',
    'Available Stock',
    'Place Bids',
    'My Bids',
    'Accepted Offers',
    'Certificates',
  ];

  return (
    <div style={styles.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>How would you like to continue?</h1>
          <p style={styles.subtitle}>Choose your role to access the right CropShift experience.</p>
        </div>

        <div style={styles.grid}>
          {/* Farmer Card */}
          <div style={{ ...styles.card, borderColor: '#22c55e44' }}>
            <div>
              <div style={styles.icon}>🌾</div>
              <h2 style={styles.cardTitle}>Farmer</h2>
              <p style={styles.cardDesc}>Plan your crop. Know your market.</p>
              <ul style={styles.featureList}>
                {farmerFeatures.map((f, i) => (
                  <li key={i} style={styles.featureItem}>
                    <span style={styles.bullet}>•</span> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <button style={styles.btnPrimary} onClick={() => navigate('/farmer/login')}>
                Farmer Login →
              </button>
              <button style={styles.btnSecondary} onClick={() => navigate('/farmer/register')}>
                Create Farmer Account
              </button>
            </div>
          </div>

          {/* Buyer Card */}
          <div style={{ ...styles.card, borderColor: '#6366f144' }}>
            <div>
              <div style={styles.icon}>🏢</div>
              <h2 style={styles.cardTitle}>Buyer / Marketplace</h2>
              <p style={styles.cardDesc}>Find farmer supply, post demand and place bids.</p>
              <ul style={styles.featureList}>
                {buyerFeatures.map((f, i) => (
                  <li key={i} style={styles.featureItem}>
                    <span style={{ ...styles.bullet, color: '#6366f1' }}>•</span> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <button style={styles.btnBuyerPrimary} onClick={() => navigate('/buyer/login')}>
                Buyer Login →
              </button>
              <button style={styles.btnBuyerSecondary} onClick={() => navigate('/buyer/register')}>
                Create Buyer Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
