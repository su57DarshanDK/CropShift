import React from 'react';
import { useNavigate } from 'react-router-dom';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BuyerWorkspaceDrawer({ isOpen, onClose }: DrawerProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const items = [
    { icon: '🏠', label: 'Buyer Dashboard', path: '/buyer', desc: 'Overview & metrics' },
    { icon: '📢', label: 'Post Demand', path: '/marketplace', desc: 'Create crop requirements' },
    { icon: '📋', label: 'My Demands', path: '/buyer-dashboard', desc: 'Track active requirements' },
    { icon: '🌱', label: 'Future Crop Marketplace', path: '/marketplace', desc: 'Browse pre-sowing lots' },
    { icon: '📦', label: 'Available Stock', path: '/marketplace', desc: 'Browse harvested stock' },
    { icon: '🔨', label: 'Auctions', path: '/marketplace', desc: 'Participate in crop auctions' },
    { icon: '💰', label: 'My Bids', path: '/buyer-dashboard', desc: 'Track submitted bids' },
    { icon: '🤝', label: 'Accepted Offers', path: '/buyer-dashboard', desc: 'Indicative acceptances' },
    { icon: '📜', label: 'Certificates', path: '/certificates', desc: 'Quality documents' },
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
            <h2 style={{ color: '#f8fafc', fontWeight: 800, fontSize: 22, margin: 0 }}>🏢 Buyer Workspace</h2>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0 0' }}>All procurement tools & options</p>
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
