import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { USE_MOCKS } from '../mocks';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/common/Button';
import FarmerWorkspaceDrawer from '../components/farmer/FarmerWorkspaceDrawer';
import NavDropdown from '../components/common/NavDropdown';
import type { DropdownItem } from '../components/common/NavDropdown';

interface Props {
  children: React.ReactNode;
}

export default function FarmerLayout({ children }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>(null);

  const { logout } = useAuth();
  const navigate = useNavigate();

  const activeClass = "text-emerald-700 font-bold border-b-2 border-emerald-600 py-2 px-1 text-[14px]";
  const inactiveClass = "text-gray-600 hover:text-emerald-700 font-medium py-2 px-1 text-[14px] transition-colors";

  // Market Dropdown Items
  const marketItems: DropdownItem[] = [
    { label: 'Buyer Demands', path: '/farmer/demands' },
    { label: 'Marketplace', path: '/marketplace' },
    { label: 'Pre-Sowing Auctions', path: '/farmer/auctions' },
    { label: 'Available Stock', path: '/farmer/stock' },
  ];

  // My Lots Dropdown Items
  const myLotsItems: DropdownItem[] = [
    { label: 'Future Crop Lots', path: '/farmer/future-lots' },
    { label: 'My Auctions', path: '/farmer/auctions' },
    { label: 'My Bids Received', path: '/farmer/bids' },
    { label: 'Accepted Offers', path: '/farmer/accepted-offers' },
    { label: 'Actual Stock', path: '/farmer/stock' },
    { label: 'Stock Auctions', path: '/farmer/stock-auctions' },
  ];

  // Support Dropdown Items
  const supportItems: DropdownItem[] = [
    { label: 'Seed Variety Comparison', path: '/recommendation' },
    { label: 'Farm Analysis', path: '/analyze' },
    { label: 'Weather Advisory', path: '/map' },
    { label: 'Subsidies / Schemes', path: '/subsidies' },
    { label: 'Certificates', path: '/certificates' },
  ];

  // Farmer Workspace Dropdown Items
  const workspaceItems: DropdownItem[] = [
    { label: 'Dashboard', path: '/farmer/home' },
    { label: 'Profile', onClick: () => setIsDrawerOpen(true) },
    { label: 'Farm Details', path: '/analyze' },
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

      {/* Farmer Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 md:h-16">
            {/* Logo & Role Badge */}
            <div className="flex items-center gap-2">
              <NavLink to="/farmer" className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-emerald-800">
                  Crop<span className="text-gray-700">Shift</span>
                </span>
                <span className="text-gray-300 font-light text-lg">|</span>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                  FARMER
                </span>
              </NavLink>
            </div>

            {/* Desktop Minimal Navigation (Under 6 Main Items) */}
            <nav className="hidden md:flex items-center space-x-5" aria-label="Farmer Navigation">
              <NavLink
                to="/farmer/home"
                className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
              >
                Home
              </NavLink>

              <NavDropdown
                title="Market"
                items={marketItems}
                activePaths={['/farmer/demands', '/marketplace', '/farmer/auctions', '/farmer/stock']}
              />

              <NavDropdown
                title="My Lots"
                items={myLotsItems}
                activePaths={['/farmer/future-lots', '/farmer/auctions', '/farmer/bids', '/farmer/accepted-offers', '/farmer/stock', '/farmer/stock-auctions', '/my-lots']}
              />

              <NavDropdown
                title="Support"
                items={supportItems}
                activePaths={['/recommendation', '/analyze', '/map', '/subsidies', '/certificates', '/profit', '/risk', '/ivr']}
              />

              <NavDropdown
                title="Farmer Workspace"
                items={workspaceItems}
                activePaths={['/farmer/home', '/farmer']}
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
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-emerald-700 hover:bg-gray-100 focus:outline-none"
              >
                <span className="sr-only">Open farmer menu</span>
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
                to="/farmer/home"
                onClick={() => setIsMenuOpen(false)}
                className="block py-2 text-gray-800 font-semibold border-b border-gray-100"
              >
                Home
              </NavLink>

              {/* Market Accordion */}
              <div className="border-b border-gray-100 py-1">
                <button
                  onClick={() => toggleMobileSection('market')}
                  className="w-full flex justify-between items-center py-1.5 text-gray-700 font-medium"
                >
                  <span>Market</span>
                  <span className="text-xs">{mobileExpandedSection === 'market' ? '▲' : '▼'}</span>
                </button>
                {mobileExpandedSection === 'market' && (
                  <div className="pl-3 py-1 space-y-1.5 border-l-2 border-emerald-500 my-1">
                    <NavLink to="/farmer/demands" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-emerald-700">
                      → Buyer Demands
                    </NavLink>
                    <NavLink to="/marketplace" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-emerald-700">
                      → Marketplace
                    </NavLink>
                    <NavLink to="/farmer/auctions" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-emerald-700">
                      → Pre-Sowing Auctions
                    </NavLink>
                    <NavLink to="/farmer/stock" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-emerald-700">
                      → Available Stock
                    </NavLink>
                  </div>
                )}
              </div>

              {/* My Lots Accordion */}
              <div className="border-b border-gray-100 py-1">
                <button
                  onClick={() => toggleMobileSection('myLots')}
                  className="w-full flex justify-between items-center py-1.5 text-gray-700 font-medium"
                >
                  <span>My Lots</span>
                  <span className="text-xs">{mobileExpandedSection === 'myLots' ? '▲' : '▼'}</span>
                </button>
                {mobileExpandedSection === 'myLots' && (
                  <div className="pl-3 py-1 space-y-1.5 border-l-2 border-emerald-500 my-1">
                    <NavLink to="/farmer/future-lots" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-emerald-700">
                      → Future Crop Lots
                    </NavLink>
                    <NavLink to="/farmer/auctions" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-emerald-700">
                      → My Auctions
                    </NavLink>
                    <NavLink to="/farmer/bids" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-emerald-700">
                      → My Bids Received
                    </NavLink>
                    <NavLink to="/farmer/accepted-offers" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-emerald-700">
                      → Accepted Offers
                    </NavLink>
                    <NavLink to="/farmer/stock" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-emerald-700">
                      → Actual Stock
                    </NavLink>
                    <NavLink to="/farmer/stock-auctions" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-emerald-700">
                      → Stock Auctions
                    </NavLink>
                  </div>
                )}
              </div>

              {/* Support Accordion */}
              <div className="border-b border-gray-100 py-1">
                <button
                  onClick={() => toggleMobileSection('support')}
                  className="w-full flex justify-between items-center py-1.5 text-gray-700 font-medium"
                >
                  <span>Support</span>
                  <span className="text-xs">{mobileExpandedSection === 'support' ? '▲' : '▼'}</span>
                </button>
                {mobileExpandedSection === 'support' && (
                  <div className="pl-3 py-1 space-y-1.5 border-l-2 border-emerald-500 my-1">
                    <NavLink to="/recommendation" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-emerald-700">
                      → Crop Recommendation
                    </NavLink>
                    <NavLink to="/analyze" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-emerald-700">
                      → Farm Analysis
                    </NavLink>
                    <NavLink to="/map" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-emerald-700">
                      → Weather Advisory
                    </NavLink>
                    <NavLink to="/subsidies" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-emerald-700">
                      → Subsidies / Schemes
                    </NavLink>
                    <NavLink to="/certificates" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-emerald-700">
                      → Certificates
                    </NavLink>
                  </div>
                )}
              </div>

              {/* Workspace Accordion */}
              <div className="border-b border-gray-100 py-1">
                <button
                  onClick={() => toggleMobileSection('workspace')}
                  className="w-full flex justify-between items-center py-1.5 text-gray-700 font-medium"
                >
                  <span>Workspace</span>
                  <span className="text-xs">{mobileExpandedSection === 'workspace' ? '▲' : '▼'}</span>
                </button>
                {mobileExpandedSection === 'workspace' && (
                  <div className="pl-3 py-1 space-y-1.5 border-l-2 border-emerald-500 my-1">
                    <NavLink to="/farmer/home" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-emerald-700">
                      → Dashboard
                    </NavLink>
                    <button
                      onClick={() => { setIsMenuOpen(false); setIsDrawerOpen(true); }}
                      className="w-full text-left block py-1 text-gray-600 hover:text-emerald-700"
                    >
                      → Profile
                    </button>
                    <NavLink to="/analyze" onClick={() => setIsMenuOpen(false)} className="block py-1 text-gray-600 hover:text-emerald-700">
                      → Farm Details
                    </NavLink>
                    <button
                      onClick={() => { setIsMenuOpen(false); setIsDrawerOpen(true); }}
                      className="w-full text-left block py-1 text-gray-600 hover:text-emerald-700"
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
      <FarmerWorkspaceDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} CropShift — Farmer Platform.</p>
          <NavLink to="/ivr" className="hover:underline text-gray-600">IVR Support (Demo)</NavLink>
        </div>
      </footer>
    </div>
  );
}
