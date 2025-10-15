import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Boxes,
  FileText,
  Users,
  CreditCard,
  HelpCircle,
  Search,
  ChevronDown
} from 'lucide-react';

const Sidebar = React.memo(() => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchInputRef = useRef(null);
  const location = useLocation(); 

  // Handle Ctrl+K shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Menu items with icons
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/bookings', label: 'Bookings', icon: Calendar },
    { path: '/resources', label: 'Resources', icon: Boxes },
    { path: '/forms', label: 'Forms', icon: FileText },
    { path: '/customers', label: 'Customers', icon: Users },
    { path: '/plans', label: 'Plans', icon: CreditCard },
    { path: '/help-desk', label: 'Help Desk', icon: HelpCircle },
  ];

  return (
    <aside
      className="hidden md:flex sticky left-0 top-0 h-screen bg-white flex-col"
      style={{ width: '232px' }}
    >
      {/* Logo Section */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-1">
          <div className="w-9 h-9 flex items-center justify-center">
            <img src="/logo.png" alt="Optimus Logo" className="w-7 h-auto object-contain" />
          </div>
          <span className="text-xl font-medium text-gray-900" style={{ fontFamily: 'Inter' }}>
            Optimus
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-4 mb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search"
            className="w-full bg-gray-100 rounded-md border-0 px-3 py-2 pl-9 text-sm text-gray-700 placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:outline-none focus:bg-white"
            style={{ fontFamily: 'Inter' }}
          />
         <span className="absolute right-[36px] top-1/2 transform -translate-y-1/2 bg-blue-100 text-blue-700 text-xs font-semibold px-1.5 py-1 rounded">
            ⌘
          </span>
          <span className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-100 text-blue-700 font-medium text-xs px-1.5 py-1 rounded">
            K
          </span>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-2 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={false} // ✅ ensures nested routes still active
                className={({ isActive }) =>
                  `flex items-center gap-3 py-2.5 px-3 rounded-md text-sm transition-all duration-150
                  ${isActive
                    ? 'bg-gray-100 text-gray-900 font-medium shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
                }
                style={{ fontFamily: 'Inter' }}
              >
                {({ isActive }) => (
                  <>
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-gray-200 p-3">
        <div
          className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors relative"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
            A
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 font-medium truncate" style={{ fontFamily: 'Inter' }}>
              anjali.ks
            </p>
            <p className="text-xs text-gray-500 truncate" style={{ fontFamily: 'Inter' }}>
              anjali.ks@powerworkspace.com
            </p>
          </div>

          {/* Dropdown Arrow */}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${dropdownOpen ? 'transform rotate-180' : ''}`}
          />
        </div>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="mt-2 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
            <button
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              style={{ fontFamily: 'Inter' }}
              onClick={() => console.log('Reset Password clicked')}
            >
              Reset Password
            </button>
            <button
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
              style={{ fontFamily: 'Inter' }}
              onClick={() => console.log('Logout clicked')}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';
export default Sidebar;
