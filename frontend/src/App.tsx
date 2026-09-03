import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import FarmInfoPage from './pages/FarmInfoPage';
import RecommendationPage from './pages/RecommendationPage';
import ProfitabilityPage from './pages/ProfitabilityPage';
import MarketPage from './pages/MarketPage';
import MapPage from './pages/MapPage';
import SubsidiesPage from './pages/SubsidiesPage';
import RiskSimulationPage from './pages/RiskSimulationPage';
import IvrPage from './pages/IvrPage';
import MustardComparisonPage from './pages/MustardComparisonPage';
import SeedComparisonPage from './pages/SeedComparisonPage';
import NotFoundPage from './pages/NotFoundPage';
import MarketplacePage from './pages/MarketplacePage';
import FutureLotPage from './pages/FutureLotPage';
import CertificatePage from './pages/CertificatePage';
import ContactSharingPage from './pages/ContactSharingPage';
import BuyerDashboardPage from './pages/BuyerDashboardPage';
import AuctionLotPage from './pages/AuctionLotPage';
import DemandDetailPage from './pages/DemandDetailPage';

// Role Separation Pages & Guards
import RoleSelectionPage from './pages/RoleSelectionPage';
import FarmerLoginPage from './pages/FarmerLoginPage';
import BuyerLoginPage from './pages/BuyerLoginPage';
import FarmerRegisterPage from './pages/FarmerRegisterPage';
import BuyerRegisterPage from './pages/BuyerRegisterPage';
import FarmerDashboardPage from './pages/FarmerDashboardPage';
import ProtectedRoute from './components/common/ProtectedRoute';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';

// Dynamic Home Router based on authentication state
function HomeRouter() {
  const { user } = useAuth();
  if (!user) {
    return <RoleSelectionPage />;
  }
  if (user.role === 'buyer') {
    return <Navigate to="/buyer/home" replace />;
  }
  return <Navigate to="/farmer/home" replace />;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ErrorBoundary>
          <MainLayout>
            <Routes>
              {/* Home & Role Selection Entry */}
              <Route path="/" element={<HomeRouter />} />
              <Route path="/select-role" element={<RoleSelectionPage />} />
              <Route path="/login" element={<RoleSelectionPage />} />

              {/* Dedicated Logins */}
              <Route path="/farmer/login" element={<FarmerLoginPage />} />
              <Route path="/login/farmer" element={<FarmerLoginPage />} />
              <Route path="/buyer/login" element={<BuyerLoginPage />} />
              <Route path="/login/buyer" element={<BuyerLoginPage />} />

              {/* Dedicated Registrations */}
              <Route path="/farmer/register" element={<FarmerRegisterPage />} />
              <Route path="/register/farmer" element={<FarmerRegisterPage />} />
              <Route path="/buyer/register" element={<BuyerRegisterPage />} />
              <Route path="/register/buyer" element={<BuyerRegisterPage />} />

              {/* Shifting Analysis & Farm Tools */}
              <Route path="/analyze" element={<FarmInfoPage />} />
              <Route path="/recommendation" element={<RecommendationPage />} />
              <Route path="/mustard-comparison/:farmId" element={<MustardComparisonPage />} />
              <Route path="/mustard-comparison" element={<MustardComparisonPage />} />
              <Route path="/seed-comparison" element={<SeedComparisonPage />} />
              <Route path="/profit" element={<ProfitabilityPage />} />
              <Route path="/market" element={<MarketPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/subsidies" element={<SubsidiesPage />} />
              <Route path="/risk" element={<RiskSimulationPage />} />
              <Route path="/ivr" element={<IvrPage />} />

              {/* Shared Marketplace & Lot Pages */}
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/my-lots" element={<FutureLotPage />} />
              <Route path="/certificates" element={<CertificatePage />} />
              <Route path="/contact-sharing/:bidId" element={<ContactSharingPage />} />
              <Route path="/buyer-dashboard" element={<BuyerDashboardPage />} />
              {/* Auction & Demand Detail Pages */}
              <Route path="/auction-lot/:lotType/:lotId" element={<AuctionLotPage />} />
              <Route path="/farmer/demands/:demandId" element={<ProtectedRoute allowedRole="farmer"><DemandDetailPage /></ProtectedRoute>} />

              {/* 🌾 FARMER ONLY ROUTES */}
              <Route path="/farmer/home" element={<ProtectedRoute allowedRole="farmer"><FarmerDashboardPage /></ProtectedRoute>} />
              <Route path="/farmer" element={<ProtectedRoute allowedRole="farmer"><FarmerDashboardPage /></ProtectedRoute>} />
              <Route path="/farmer/farm" element={<ProtectedRoute allowedRole="farmer"><FarmInfoPage /></ProtectedRoute>} />
              <Route path="/farmer/recommendation" element={<ProtectedRoute allowedRole="farmer"><RecommendationPage /></ProtectedRoute>} />
              <Route path="/farmer/seed-comparison" element={<ProtectedRoute allowedRole="farmer"><SeedComparisonPage /></ProtectedRoute>} />
              <Route path="/farmer/mustard-comparison" element={<ProtectedRoute allowedRole="farmer"><MustardComparisonPage /></ProtectedRoute>} />
              <Route path="/farmer/demands" element={<ProtectedRoute allowedRole="farmer"><MarketplacePage /></ProtectedRoute>} />
              <Route path="/farmer/my-lots" element={<ProtectedRoute allowedRole="farmer"><FutureLotPage /></ProtectedRoute>} />
              <Route path="/farmer/future-lots" element={<ProtectedRoute allowedRole="farmer"><FutureLotPage /></ProtectedRoute>} />
              <Route path="/farmer/certificates" element={<ProtectedRoute allowedRole="farmer"><CertificatePage /></ProtectedRoute>} />
              <Route path="/farmer/auctions" element={<ProtectedRoute allowedRole="farmer"><FutureLotPage /></ProtectedRoute>} />
              <Route path="/farmer/bids" element={<ProtectedRoute allowedRole="farmer"><FutureLotPage /></ProtectedRoute>} />
              <Route path="/farmer/accepted-offers" element={<ProtectedRoute allowedRole="farmer"><FutureLotPage /></ProtectedRoute>} />
              <Route path="/farmer/stock" element={<ProtectedRoute allowedRole="farmer"><FutureLotPage /></ProtectedRoute>} />
              <Route path="/farmer/stock-auctions" element={<ProtectedRoute allowedRole="farmer"><FutureLotPage /></ProtectedRoute>} />
              <Route path="/farmer/weather" element={<ProtectedRoute allowedRole="farmer"><MapPage /></ProtectedRoute>} />
              <Route path="/farmer/schemes" element={<ProtectedRoute allowedRole="farmer"><SubsidiesPage /></ProtectedRoute>} />

              {/* 🏢 BUYER ONLY ROUTES */}
              <Route path="/buyer/home" element={<ProtectedRoute allowedRole="buyer"><BuyerDashboardPage /></ProtectedRoute>} />
              <Route path="/buyer" element={<ProtectedRoute allowedRole="buyer"><BuyerDashboardPage /></ProtectedRoute>} />
              <Route path="/buyer/demands" element={<ProtectedRoute allowedRole="buyer"><BuyerDashboardPage /></ProtectedRoute>} />
              <Route path="/buyer/marketplace" element={<ProtectedRoute allowedRole="buyer"><MarketplacePage /></ProtectedRoute>} />
              <Route path="/buyer/future-crops" element={<ProtectedRoute allowedRole="buyer"><MarketplacePage /></ProtectedRoute>} />
              <Route path="/buyer/stock" element={<ProtectedRoute allowedRole="buyer"><MarketplacePage /></ProtectedRoute>} />
              <Route path="/buyer/auctions" element={<ProtectedRoute allowedRole="buyer"><MarketplacePage /></ProtectedRoute>} />
              <Route path="/buyer/bids" element={<ProtectedRoute allowedRole="buyer"><BuyerDashboardPage /></ProtectedRoute>} />
              <Route path="/buyer/accepted-offers" element={<ProtectedRoute allowedRole="buyer"><BuyerDashboardPage /></ProtectedRoute>} />
              <Route path="/buyer/certificates" element={<ProtectedRoute allowedRole="buyer"><CertificatePage /></ProtectedRoute>} />
              {/* Buyer can also view auction lot pages */}
              <Route path="/buyer/auction-lot/:lotType/:lotId" element={<ProtectedRoute allowedRole="buyer"><AuctionLotPage /></ProtectedRoute>} />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </MainLayout>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
