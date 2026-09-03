import React from 'react';
import { useNavigate } from 'react-router-dom';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FarmerWorkspaceDrawer({ isOpen, onClose }: DrawerProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const items = [
    { icon: '🏠', label: 'Dashboard', path: '/farmer', desc: 'Home overview' },
    { icon: '🌱', label: 'My Farm', path: '/analyze', desc: 'Enter/edit farm details' },
    { icon: '🌾', label: 'Crop Recommendation', path: '/recommendation', desc: 'Optimal shifting analysis' },
    { icon: '📢', label: 'Buyer Demand', path: '/marketplace', desc: 'Discover buyer demand' },
    { icon: '🌱', label: 'My Future Crop Lots', path: '/my-lots', desc: 'Manage pre-sowing lots' },
    { icon: '🔨', label: 'My Auctions', path: '/my-lots', desc: 'Live auction bids' },
    { icon: '📜', label: 'My Certificates', path: '/certificates', desc: 'Quality certificates' },
    { icon: '💰', label: 'My Bids', path: '/my-lots', desc: 'Bids received' },
    { icon: '🤝', label: 'Accepted Offers', path: '/my-lots', desc: 'Indicative acceptances' },
    { icon: '📦', label: 'My Stock', path: '/my-lots', desc: 'Harvested stock lots' },
    { icon: '⚡', label: 'Stock Auctions', path: '/my-lots', desc: 'Sell available stock' },
    { icon: '🌦️', label: 'Weather', path: '/farmer/weather', desc: 'Regional forecasts' },
    { icon: '🏛️', label: 'Schemes', path: '/subsidies', desc: 'Government subsidies' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end',
    }} onClick={onClose}>
      <div style={{
        background: '#0f172a', borderLeft: '1px solid #334155',
        width: '100%', maxWidth: 420, height: '100%', padding: '28px 24px',
        overflowY: 'auto', fontFamily: "'Inter', sans-serif",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ color: '#f8fafc', fontWeight: 800, fontSize: 22, margin: 0 }}>🌾 Farmer Workspace</h2>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0 0' }}>All farmer tools & services</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 24, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          {items.map(item => (
            <div key={item.label} onClick={() => { navigate(item.path); onClose(); }} style={{
              background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14,
              cursor: 'pointer', transition: 'all 0.2s',
            }}>
              <span style={{ fontSize: 24 }}>{item.icon}</span>
              <div>
                <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: 14 }}>{item.label}</div>
                <div style={{ color: '#64748b', fontSize: 12 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
