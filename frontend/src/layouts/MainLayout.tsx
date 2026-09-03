import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import UnauthenticatedLayout from './UnauthenticatedLayout';
import FarmerLayout from './FarmerLayout';
import BuyerLayout from './BuyerLayout';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user } = useAuth();
  const location = useLocation();

  const authPaths = [
    '/select-role',
    '/login',
    '/login/farmer',
    '/login/buyer',
    '/register/farmer',
    '/register/buyer',
  ];

  const isAuthOrUnauthenticated = !user || authPaths.includes(location.pathname);

  // 1. Unauthenticated or Role Selection / Auth Pages -> Minimal Unauthenticated Layout
  if (isAuthOrUnauthenticated) {
    return <UnauthenticatedLayout>{children}</UnauthenticatedLayout>;
  }

  // 2. Logged in as Buyer -> Dedicated Buyer Layout
  if (user?.role === 'buyer') {
    return <BuyerLayout>{children}</BuyerLayout>;
  }

  // 3. Logged in as Farmer -> Dedicated Farmer Layout
  return <FarmerLayout>{children}</FarmerLayout>;
}
