import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export interface DropdownItem {
  label: string;
  path?: string;
  onClick?: () => void;
}

interface NavDropdownProps {
  title: string;
  items: DropdownItem[];
  activePaths?: string[];
  activeColorClass?: string;
  inactiveColorClass?: string;
  hoverColorClass?: string;
}

export default function NavDropdown({
  title,
  items,
  activePaths = [],
  activeColorClass = 'text-emerald-700 font-bold border-b-2 border-emerald-600',
  inactiveColorClass = 'text-gray-600 hover:text-emerald-700 font-medium',
  hoverColorClass = 'hover:bg-emerald-50 text-emerald-800',
}: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Check if any sub-item path is active
  const isSubActive = items.some(item => item.path && location.pathname === item.path) ||
    activePaths.some(path => location.pathname === path);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1 py-2 px-1 text-[14px] leading-5 transition-colors focus:outline-none ${
          isSubActive ? activeColorClass : inactiveColorClass
        }`}
        aria-expanded={isOpen}
      >
        <span>{title}</span>
        <span className={`text-[10px] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 md:left-0 md:right-auto mt-1 w-52 rounded-lg bg-white shadow-lg border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {items.map((item, idx) => {
            if (item.path) {
              return (
                <NavLink
                  key={`${item.path}-${idx}`}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `block px-4 py-2 text-[13px] font-medium transition-colors ${
                      isActive
                        ? `${hoverColorClass} font-semibold`
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              );
            }
            return (
              <button
                key={`btn-${idx}`}
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (item.onClick) item.onClick();
                }}
                className="w-full text-left block px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
