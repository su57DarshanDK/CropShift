import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { USE_MOCKS } from '../mocks';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/common/Button';
import BuyerWorkspaceDrawer from '../components/buyer/BuyerWorkspaceDrawer';
import NavDropdown from '../components/common/NavDropdown';
import type { DropdownItem } from '../components/common/NavDropdown';

interface Props {
  children: React.ReactNode;
}

export default function BuyerLayout({ children }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>(null);

  const { logout } = useAuth();
  const navigate = useNavigate();

  const activeClass = "text-indigo-700 font-bold border-b-2 border-indigo-600 py-2 px-1 text-[14px]";
  const inactiveClass = "text-gray-600 hover:text-indigo-700 font-medium py-2 px-1 text-[14px] transition-colors";

  // Activity Dropdown Items
  const activityItems: DropdownItem[] = [
    { label: 'My Demands', path: '/buyer/demands' },
    { label: 'My Bids', path: '/buyer/bids' },
    { label: 'Accepted Offers', path: '/buyer/accepted-offers' },
  ];

  // Buyer Workspace Dropdown Items
  const workspaceItems: DropdownItem[] = [
    { label: 'Dashboard', path: '/buyer/home' },
    { label: 'Profile', onClick: () => setIsDrawerOpen(true) },
    { label: 'Account Settings', onClick: () => setIsDrawerOpen(true) },
  ];

  const toggleMobileSection = (section: string) => {
    setMobileExpandedSection(prev => (prev === section ? null : section));
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      {/* Demo Mode Banner */}
      {USE_MOCKS && (
        <div className="bg-amber-500 text-white text-xs font-bold text-center py-1.5 px-4 shadow-sm z-50">
          <span>Demo Mode — showing demonstration data</span>
        </div>
      )}

      {/* Buyer Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 md:h-16">
            {/* Logo & Role Badge */}
            <div className="flex items-center gap-2">
              <NavLink to="/buyer" className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-indigo-800">
                  Crop<span className="text-gray-700">Shift</span>
                </span>
                <span className="text-gray-300 font-light text-lg">|</span>
                <span className="bg-indigo-100 text-indigo-800 text-[11px] font-bold px-2 py-0.5 rounded border border-indigo-200 uppercase tracking-wider">
                  BUYER
                </span>
              </NavLink>
            </div>

            {/* Desktop Minimal Navigation (Under 6 Main Items) */}
            <nav className="hidden md:flex items-center space-x-5" aria-label="Buyer Navigation">
              <NavLink
                to="/buyer/home"
                className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
              >
                Home
              </NavLink>

              <NavLink
                to="/marketplace"
                className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
              >
                Marketplace
              </NavLink>

              <NavDropdown
                title="Activity"
                items={activityItems}
                activePaths={['/buyer/demands', '/buyer/bids', '/buyer/accepted-offers', '/buyer-dashboard']}
                activeColorClass="text-indigo-700 font-bold border-b-2 border-indigo-600"
                inactiveColorClass="text-gray-600 hover:text-indigo-700 font-medium"
                hoverColorClass="hover:bg-indigo-50 text-indigo-800"
              />

              <NavLink
                to="/certificates"
                className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
              >
                Certificates
              </NavLink>

              <NavDropdown
                title="Buyer Workspace"
                items={workspaceItems}
                activePaths={['/buyer/home', '/buyer']}
                activeColorClass="text-indigo-700 font-bold border-b-2 border-indigo-600"
                inactiveColorClass="text-gray-600 hover:text-indigo-700 font-medium"
                hoverColorClass="hover:bg-indigo-50 text-indigo-800"
              />
            </nav>

            {/* Right Action: Logout Button */}
            <div className="hidden md:flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  logout();
                  navigate('/select-role');
                }}
                className="text-xs font-semibold px-3 py-1.5"
              >
                Logout
              </Button>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex items-center md:hidden">
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-indigo-700 hover:bg-gray-100 focus:outline-none"
              >
                <span className="sr-only">Open buyer menu</span>
                {isMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-b border-gray-200 bg-white">
            <nav className="px-4 pt-2 pb-4 space-y-2 text-sm font-medium">
              <NavLink
                to="/buyer/home"
                onClick={() => setIsMenuOpen(false)}
                className="block py-2 text-gray-800 font-semibold border-b border-gray-100"
              >
                Home
              </NavLink>

              <NavLink
                to="/marketplace"
                onClick={() => setIsMenuOpen(false)}
                className="block py-2 text-gray-800 font-semibold border-b border-gray-100"
              >
                Marketplace
              </NavLink>

              {/* Activity Accordion */}
              <div className="border-b border-gray-100 py-1">
                <button
                  onClick={() => toggleMobileSection('activity')}
                  className="w-full flex justify-between items-center py-1.5 text-gray-700 font-medium"
                >
                  <span>Activity</span>
                  <span className="text-xs">{mobileExpandedSection === 'activity' ? '▲' : '▼'}</span>
                </button>
                {mobileExpandedSection === 'activity' && (
                  <div className="pl-3 py-1 space-y-1.5 border-l-2 border-indigo-500 my-1">
                    <NavLink to="/buyer/demands" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-indigo-700">
                      → My Demands
                    </NavLink>
                    <NavLink to="/buyer/bids" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-indigo-700">
                      → My Bids
                    </NavLink>
                    <NavLink to="/buyer/accepted-offers" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-indigo-700">
                      → Accepted Offers
                    </NavLink>
                  </div>
                )}
              </div>

              <NavLink
                to="/certificates"
                onClick={() => setIsMenuOpen(false)}
                className="block py-2 text-gray-800 font-semibold border-b border-gray-100"
              >
                Certificates
              </NavLink>

              {/* Workspace Accordion */}
              <div className="border-b border-gray-100 py-1">
                <button
                  onClick={() => toggleMobileSection('workspace')}
                  className="w-full flex justify-between items-center py-1.5 text-gray-700 font-medium"
                >
                  <span>Buyer Workspace</span>
                  <span className="text-xs">{mobileExpandedSection === 'workspace' ? '▲' : '▼'}</span>
                </button>
                {mobileExpandedSection === 'workspace' && (
                  <div className="pl-3 py-1 space-y-1.5 border-l-2 border-indigo-500 my-1">
                    <NavLink to="/buyer/home" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-indigo-700">
                      → Dashboard
                    </NavLink>
                    <button
                      onClick={() => { setIsMenuOpen(false); setIsDrawerOpen(true); }}
                      className="w-full text-left block py-1 text-gray-600 hover:text-indigo-700"
                    >
                      → Profile
                    </button>
                    <button
                      onClick={() => { setIsMenuOpen(false); setIsDrawerOpen(true); }}
                      className="w-full text-left block py-1 text-gray-600 hover:text-indigo-700"
                    >
                      → Account Settings
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Logout */}
              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full text-sm font-semibold"
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                    navigate('/select-role');
                  }}
                >
                  Logout
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Workspace Drawer */}
      <BuyerWorkspaceDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} CropShift — Buyer Portal.</p>
          <NavLink to="/marketplace" className="hover:underline text-gray-600">Browse Marketplace</NavLink>
        </div>
      </footer>
    </div>
  );
}
