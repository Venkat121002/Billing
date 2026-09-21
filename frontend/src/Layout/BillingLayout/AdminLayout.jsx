
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  LayoutDashboard,
  Users,
  Briefcase,
  ClipboardCheck,
  Calendar,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  AlertTriangle,
  Search,
  ChevronLeft,
  PrinterCheck,
  CreditCard,
  CirclePercent,
  BarChart3
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import axios from "axios";
import API_URL from "../../config/api";
import logo from "../../assets/images/BILLING LOGO .png";
import logo1 from "../../assets/images/BILLING_LOGO_LARGE2.png"
import { getSidebarItems } from "../../config/industryModules";
import { resolveIndustryProfile } from "../../config/industryProfiles";
import { SubscriptionBadge } from "../../components/Auth/SubscriptionStatus";



const BillingLayout = ({ children, hideHeader = false, hideSidebar = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const userData = currentUser;
  const navigate = useNavigate();
  const [isBellOpen, setIsBellOpen] = useState(false);


  const { key: industryKey } = resolveIndustryProfile(userData);

  const isAcademy = industryKey === 'academy';

  const menuItems = getSidebarItems(industryKey).filter(item => {
    if (userData?.role !== 'owner' && userData?.role !== 'TenantAdmin') {
      if (item.path.includes('section=sub_users') || item.path === '/staff-records') {
        return false;
      }
    }
    return true;
  });

  const isActive = (path) => location.pathname.startsWith(path);

  // Listen for low stock products (Only for Owners as they have personal collections)
  useEffect(() => {
    const fetchNotifications = async () => {
      // Ensure we have a user
      const userId = userData?.uid || userData?.userId;
      if (!userId) return;

      const token = sessionStorage.getItem("token");
      if (!token) return;

      try {
        const config = { headers: { "x-auth-token": token } };
        const res = await axios.get(`${API_URL}/products`, config);
        
        const role = userData?.role;
        const products = res.data.filter((item) => {
          if (role === "owner" || role === "TenantAdmin") {
            return item.source === "Owner" || item.createdBy === userId;
          }
          return item.createdBy === userId;
        });

        const lowStockNotifications = products
          .filter(p => (Number(p.quantity) || 0) <= (Number(p.reorderLevel) || 5))
          .map(p => ({
            id: p.id,
            productName: p.name,
            quantity: p.quantity
          }));

        setNotifications(lowStockNotifications);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchNotifications();
  }, [userData]);

  return (
    <div className="min-h-screen bg-white font-sans">

      {!hideSidebar && (
        <aside
          className={`fixed inset-y-0 left-0 z-50 ${sidebarExpanded ? "w-64" : "w-16"} transform transition-all duration-300 
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        bg-white border-r border-green-100 shadow-lg flex flex-col`}
        >
          {/* Logo */}
          <div className={`flex items-center justify-between h-16 ${sidebarExpanded ? "px-6" : "px-2"} border-b border-green-100`}>
            <Link to="/dashboard" className="flex items-center justify-center w-full">
             
              
              <div>
                <img src={sidebarExpanded ? logo : logo1} alt="Logo" className={`${sidebarExpanded ? "w-44" : "w-10"} object-contain`} />
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className={`lg:hidden text-gray-500 hover:text-green-600`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation - Scrollable Area */}
          <nav className={`flex-1 overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-green-200`}>
            <div className="space-y-1">
              {menuItems.map((item, index) => (
                <Link
                  key={index}
                  to={item.path}
                  state={item.state}
                  className={`flex items-center ${sidebarExpanded ? "px-4" : "px-2 justify-center"} py-3 rounded-xl transition-all duration-200
                ${isActive(item.path)
                      ? `bg-green-100 text-green-700 border-green-600 font-semibold border-l-4`
                      : `text-gray-600 hover:bg-green-50 hover:text-green-600`
                    }`}
                >
                  <item.icon className={`w-5 h-5 ${sidebarExpanded ? "mr-3" : ""}`} />
                  <span className={`${sidebarExpanded ? "inline text-sm" : "hidden"}`}>{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          {/* Bottom Section - Fixed at bottom */}
          <div className={`mt-auto ${sidebarExpanded ? "p-4" : "p-2"} border-t border-green-100 bg-white/50 backdrop-blur-sm`}>
            <Link
              to="/settings"
              className={`flex items-center ${sidebarExpanded ? "px-4" : "px-2 justify-center"} py-3 rounded-xl text-gray-600 hover:bg-green-50 hover:text-green-600 transition`}
            >
              <Settings className={`w-5 h-5 ${sidebarExpanded ? "mr-3" : ""}`} />
              <span className={`${sidebarExpanded ? "text-sm font-medium inline" : "hidden"}`}>Settings</span>
            </Link>

            <button
              onClick={() => setShowLogoutModal(true)}
              className={`flex items-center mt-2 ${sidebarExpanded ? "px-4" : "px-2 justify-center"} py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition w-full`}
            >
              <LogOut className={`w-5 h-5 ${sidebarExpanded ? "mr-3" : ""}`} />
              <span className={`${sidebarExpanded ? "text-sm font-medium inline" : "hidden"}`}>Log out</span>
            </button>
          </div>
        </aside>
      )}

      {/* ================= MAIN CONTENT ================= */}
      <div className={`transition-all duration-300 ${!hideSidebar ? (sidebarExpanded ? "lg:ml-64" : "lg:ml-16") : ""}`}>

        {/* ================= TOP HEADER ================= */}
        {!hideHeader && (
          <header className={`bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-green-100`}>
            <div className="flex items-center justify-between h-16 px-3 sm:px-6">

              {/* Left */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    if (window.innerWidth >= 1024) {
                      setSidebarExpanded(!sidebarExpanded);
                    } else {
                      setSidebarOpen(!sidebarOpen);
                    }
                  }}
                  className={`text-gray-600 hover:text-green-600`}
                >
                  <Menu className="w-6 h-6" />
                </button>

                {/* Search */}
                {/* <div className="hidden md:block relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="search"
                    placeholder="Search..."
                    className="pl-10 pr-4 py-2 w-64 rounded-xl border border-green-200 bg-green-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 text-sm outline-none"
                  />
                </div> */}
              </div>

              {/* Right */}
              <div className="flex items-center gap-2 sm:gap-4 relative">

                {/* Notifications */}
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative p-2 rounded-xl hover:bg-green-50 hover:text-green-600 text-gray-600 transition`}
                >
                  <Bell className="w-6 h-6" />
                  {notifications.length > 0 && (
                    <span className={`absolute top-1 right-1 w-2.5 h-2.5 bg-green-600 rounded-full border-2 border-white`} />
                  )}
                </button>
                

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className={`absolute right-0 top-14 w-80 bg-white rounded-2xl shadow-xl border border-green-100 overflow-hidden`}>
                    <div className={`flex justify-between items-center px-4 py-3 border-b border-green-100`}>
                      <span className="font-semibold text-sm text-gray-700">
                        Notifications
                      </span>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500">
                        No notifications
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-4 border-b border-green-50 text-sm text-gray-600 hover:bg-green-50 transition`}
                        >
                          {isAcademy? 
                          <p>
                            <span className="font-semibold">{n.productName.charAt(0).toUpperCase() + n.productName.slice(1)}</span>{" "}
                             Batch Full ({n.quantity} Seats Available)
                          </p>:
                          <p>
                            <span className="font-semibold">{n.productName}</span>{" "}
                            is low stock ({n.quantity} left)
                          </p> }
                          
                          
                          <Link
                            to="/inventory"
                            onClick={() => setShowNotifications(false)}
                            className={`text-green-600 font-semibold hover:underline`}
                          >
                            Reorder Now
                          </Link>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <SubscriptionBadge user={userData} />

                {/* Profile */}
                <div className="flex items-center gap-3">
                  <img
                    src={
                      userData?.logo ||
                      `https://ui-avatars.com/api/?name=${userData.Tenant.name.charAt(0).toUpperCase()}&background=16A34A&color=fff`
                    }
                    alt="Profile"
                    className={`w-9 h-9 rounded-full border-2 border-green-200 shadow-sm`}
                  />
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-gray-700">
                      {userData?.role === "owner"
                        ? userData.Tenant.name.charAt(0).toUpperCase() + userData.Tenant.name.slice(1)
                        : `${userData?.role?.charAt(0).toUpperCase() + userData?.role?.slice(1)}`}
                    </p>
                    {userData?.role !== 'owner' && (
                      <p className="text-[10px] text-gray-400 font-medium">Team Member</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* ================= PAGE CONTENT ================= */}
        <main className="p-4 text-gray-800 max-w-7xl mx-auto">
          {children}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 max-w-sm w-full p-8 transform transition-all animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-2">Confirm Logout</h3>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Are you sure you want to log out? You will need to login again to access your business records.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    await logout();
                    navigate("/login");
                  }}
                  className="w-full py-3.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-lg shadow-red-200 transition-all active:scale-[0.98]"
                >
                  Yes, Logout
                </button>
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="w-full py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 font-bold hover:bg-gray-100 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

};

export default BillingLayout;
