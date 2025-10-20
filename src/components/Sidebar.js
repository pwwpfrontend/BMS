import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Boxes,
  FileText,
  Users,
  CreditCard,
  HelpCircle,
  Search,
  ChevronDown,
  KeyRound,
  LogOut
} from 'lucide-react';

const Sidebar = React.memo(() => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [user, setUser] = useState({
    username: 'Loading...',
    email: 'Loading...',
    role: 'User'
  });
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  // BMS Auth0 Management API configuration
  const config = {
    domain: "bms-optimus.us.auth0.com",
    clientId: "x3UIh4PsAjdW1Y0uTmjDUk5VIA36iQ12",
    clientSecret: "xYfZ6lk_kJoLy73sgh3jAY_4U4bMnwm58EjN97Ozw-JcsQTs36JpA2UM4C2xVn-r",
    audience: "https://bms-optimus.us.auth0.com/api/v2/",
  };

  // Fetch Management API access token
  const getManagementAccessToken = async () => {
    try {
      const response = await fetch(`https://${config.domain}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          audience: config.audience,
          grant_type: "client_credentials",
          scope: "read:users read:users_app_metadata update:users_app_metadata read:user_idp_tokens",
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get management token');
      }
      
      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error("Error getting management token:", error);
      return null;
    }
  };

  // Fetch current user data from Auth0
  useEffect(() => {
    let isMounted = true; // Track if component is mounted

    const fetchCurrentUser = async () => {
      try {
        // Get stored user info
        const storedUser = JSON.parse(sessionStorage.getItem("user"));
        
        if (!storedUser || !storedUser.email) {
          console.error("No user found in session");
          if (isMounted) {
            navigate('/login');
          }
          return;
        }

        // Get management API token
        const token = await getManagementAccessToken();
        
        if (!token) {
          console.error("Failed to get management token");
          if (isMounted) {
            setUser(storedUser); // Use stored data as fallback
          }
          return;
        }

        // Fetch all users and find current user
        const response = await fetch(`${config.audience}users`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        if (!isMounted) return; // Don't update state if unmounted

        if (response.ok) {
          const allUsers = await response.json();
          const auth0User = allUsers.find((u) => u.email === storedUser.email);

          if (auth0User) {
            const userData = {
              username: auth0User.user_metadata?.username || 
                        auth0User.username || 
                        auth0User.email.split("@")[0],
              email: auth0User.email,
              role: auth0User.app_metadata?.role || "User",
            };

            if (isMounted) {
              setUser(userData);
              sessionStorage.setItem("user", JSON.stringify(userData));
              console.log("Fetched User from Auth0:", userData);
            }
          } else {
            // User not found in Auth0, use stored data
            if (isMounted) {
              setUser(storedUser);
            }
          }
        } else {
          console.error("Failed to fetch users:", await response.text());
          if (isMounted) {
            setUser(storedUser); // Use stored data as fallback
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        // Use stored data as fallback
        const storedUser = JSON.parse(sessionStorage.getItem("user"));
        if (storedUser && isMounted) {
          setUser(storedUser);
        }
      }
    };

    fetchCurrentUser();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [navigate]);

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

  // Handle logout
  const handleLogout = () => {
    // Clear session data
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("access_token");
    
    // Close dropdown before navigation
    setDropdownOpen(false);
    
    // Navigate to login
    setTimeout(() => {
      navigate("/login", { replace: true });
    }, 0);
  };

  // Handle password reset
  const handleResetPassword = async () => {
    try {
      const response = await fetch(
        `https://${config.domain}/dbconnections/change_password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: "Q6sGKEIJKyFMoTzm6mzq9eM9KNVdjCOy", // Use the BMS web client ID
            email: user.email,
            connection: "Username-Password-Authentication",
          }),
        }
      );

      if (response.ok) {
        setIsOverlayOpen(true);
        setDropdownOpen(false);
        setTimeout(() => setIsOverlayOpen(false), 3000);
      } else {
        const errorData = await response.json();
        console.error("Password reset error:", errorData);
      }
    } catch (error) {
      console.error("Error sending password reset email:", error);
    }
  };

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
                end={false}
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
            {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 font-medium truncate" style={{ fontFamily: 'Inter' }}>
              {user.username}
            </p>
            <p className="text-xs text-gray-500 truncate" style={{ fontFamily: 'Inter' }}>
              {user.email}
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
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
              style={{ fontFamily: 'Inter' }}
              onClick={(e) => {
                e.stopPropagation();
                handleResetPassword();
              }}
            >
              <KeyRound className="w-4 h-4 mr-2" />
              Reset Password
            </button>
            <button
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 flex items-center"
              style={{ fontFamily: 'Inter' }}
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Password Reset Overlay */}
      {isOverlayOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Inter' }}>
              Password Reset Sent
            </h2>
            <p className="text-gray-600 text-sm" style={{ fontFamily: 'Inter' }}>
              A reset link has been sent to <strong>{user.email}</strong>. Please check your inbox.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';
export default Sidebar;