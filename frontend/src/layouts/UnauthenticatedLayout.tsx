import React from 'react';
import { NavLink } from 'react-router-dom';
import { USE_MOCKS } from '../mocks';

interface Props {
  children: React.ReactNode;
}

export default function UnauthenticatedLayout({ children }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      {/* Demo Mode Indicator Banner */}
      {USE_MOCKS && (
        <div className="bg-amber-500 text-white text-xs md:text-sm font-bold text-center py-2 px-4 shadow-sm z-50">
          <span>Demo Mode — showing demonstration data</span>
        </div>
      )}

      {/* Minimal Unauthenticated Header — NO navigation links */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-sm py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          {/* Logo & Simple Branding ONLY */}
          <NavLink to="/select-role" className="flex items-center gap-2 text-decoration-none">
            <span className="text-2xl font-bold tracking-tight text-white">
              🌾 Crop<span className="text-emerald-400">Shift</span>
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold px-2.5 py-0.5 rounded border border-emerald-500/30 tracking-wider">
              Oilseed Market-Linkage Platform
            </span>
          </NavLink>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} CropShift. Connecting farmers & oilseed buyers across India.
          </p>
          <div className="flex gap-4 text-xs text-slate-500">
            <span>English</span>
            <span>&bull;</span>
            <NavLink to="/select-role" className="hover:underline text-slate-400">Role Selection</NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
