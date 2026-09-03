import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: 'farmer' | 'buyer';
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  if (!token || !user) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        padding: 24,
      }}>
        <div style={{
          background: 'rgba(30,41,59,0.95)',
          border: '1px solid #334155',
          borderRadius: 24,
          padding: 48,
          maxWidth: 460,
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', marginBottom: 8 }}>
            Authentication Required
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
            Please log in to access this page.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/select-role')}
              style={{
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '12px 24px',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Choose Role & Login →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (allowedRole && user.role !== allowedRole) {
    const isFarmerPage = allowedRole === 'farmer';
    const targetDashboard = user.role === 'buyer' ? '/buyer' : '/farmer';

    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        padding: 24,
      }}>
        <div style={{
          background: 'rgba(30,41,59,0.95)',
          border: '1px solid #ef444444',
          borderRadius: 24,
          padding: 48,
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fca5a5', marginBottom: 8 }}>
            Access Restricted
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 15, marginBottom: 24 }}>
            This page is available only to {isFarmerPage ? 'Farmer' : 'Buyer'} accounts. You are currently logged in as a <strong>{user.role === 'buyer' ? 'Buyer' : 'Farmer'}</strong>.
          </p>
          <button
            onClick={() => navigate(targetDashboard)}
            style={{
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '12px 24px',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
            }}
          >
            Go to My Dashboard ({user.role === 'buyer' ? '🏢 Buyer' : '🌾 Farmer'}) →
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
