import { useState, useEffect } from "react";
import axios from "axios";
import logo from "../assets/images/BILLING LOGO .png";
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
  Search,
  ChevronLeft,
  PrinterCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";


const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const userData = currentUser;

  // Api instance
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
  });
  api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem("token");
    if (token) config.headers["x-auth-token"] = token;
    return config;
  });

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // const res = await api.get("/notifications");
        // setNotifications(res.data);
        const [notifRes, productsRes] = await Promise.all([
          api.get("/notifications"),
          api.get("/products"),
        ]);

        let allNotifications = notifRes.data;

        const lowStockProducts = productsRes.data.filter(
          (p) => p.reorderLevel > 0 && p.quantity > 0 && p.quantity <= p.reorderLevel
        );

        if (lowStockProducts.length > 0) {
          const lowStockNotification = {
            id: "low-stock-alert",
            type: "Warning",
            title: "Low Stock Alert",
            message: `${lowStockProducts.length} item(s) are running low on stock.`,
            isLowStock: true,
            createdAt: new Date().toISOString(),
          };
          allNotifications.unshift(lowStockNotification);
        }

        setNotifications(allNotifications);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };
    if (currentUser) {
      fetchNotifications();
    }
  // }, [currentUser]);
  }, [currentUser, api]);

  const menuItems = [
    {
      icon: Users,
      label: "Attendance",
      path: "/attendance",
    },
    {
      icon: Calendar,
      label: "Add Attendance",
      path: "/add-attendance",
    },
    {
      icon: ClipboardCheck,
      label: "Leaves",
      path: "/leave-management",
    },
    {
      icon: Users,
      label: "Students",
      path: "/student-management",
    },
    {
      icon: Users,
      label: "Employees",
      path: "/employee-management",
    },
    {
      icon: Briefcase,
      label: "Payrolls",
      path: "/payroll",
    },
    {
      icon: ClipboardCheck,
      label: "Reports",
      path: "/attendance-reports",
    },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 ${sidebarExpanded ? "w-64" : "w-16"} transform transition-all duration-300 
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          bg-white dark:bg-gray-800 dark:border-r dark:border-gray-700`}
      >
        {/* Logo Section */}
        <div className={`flex items-center justify-between h-16 ${sidebarExpanded ? "px-6" : "px-2"} border-b border-slate-100 dark:border-gray-700`}>
          <Link to="/dashboard" className="flex items-center justify-center w-full">
            <img src={logo} alt="SwordNex Logo" className={`${sidebarExpanded ? "w-48" : "w-10"} h-auto object-contain`} />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-500 dark:text-gray-400 hover:text-blue-600"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className={`${sidebarExpanded ? "px-4" : "px-2"} py-4`}>
          <ul className="space-y-1">
            {menuItems.map((item, index) => (
              <li key={index}>
                <Link
                  to={item.path}
                  className={`flex items-center ${sidebarExpanded ? "px-4" : "px-2 justify-center"} py-3 rounded-lg transition-all
                    ${isActive(item.path)
                      ? "bg-blue-50 text-blue-600 font-semibold dark:bg-blue-900/30 dark:text-blue-400"
                      : "text-slate-600 dark:text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-gray-700 dark:hover:text-blue-400"
                    }`}
                >
                  <item.icon
                    className={`w-5 h-5 ${sidebarExpanded ? "mr-3" : ""} ${isActive(item.path) ? "text-current" : "text-slate-500"
                      }`}
                  />
                  <span className={`${sidebarExpanded ? "font-medium text-sm inline" : "hidden"}`}>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom Section */}
        <div className={`absolute bottom-0 left-0 right-0 ${sidebarExpanded ? "p-4" : "p-2"} border-t border-slate-100 dark:border-gray-700`}>
          <div className="flex items-center justify-between mb-3">
            <Link
              to="/settings"
              className={`p-2 rounded-lg text-slate-500 dark:text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-gray-700 ${sidebarExpanded ? "" : "flex justify-center"}`}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className={`flex items-center w-full ${sidebarExpanded ? "px-4" : "px-2 justify-center"} py-3 rounded-lg transition-colors text-slate-600 dark:text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-gray-700`}
          >
            <LogOut className={`w-5 h-5 ${sidebarExpanded ? "mr-3" : ""}`} />
            <span className={`${sidebarExpanded ? "font-medium text-sm inline" : "hidden"}`}>Home</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${sidebarOpen ? (sidebarExpanded ? "lg:ml-64" : "lg:ml-16") : "ml-0"
          }`}
      >
        {/* Top Navigation */}
        <header className="bg-white dark:bg-gray-800 sticky top-0 z-40">
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (window.innerWidth >= 1024) {
                    setSidebarExpanded(!sidebarExpanded);
                  } else {
                    setSidebarOpen(!sidebarOpen);
                  }
                }}
                className="text-slate-500 dark:text-gray-400 hover:text-blue-600"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Search Bar */}
              <div className="hidden md:flex items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="search"
                    placeholder="Search..."
                    className="pl-10 pr-4 py-2.5 w-64 rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setIsNotifOpen((prev) => !prev)}
                  className="relative p-2 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                >
                  <Bell className="w-6 h-6" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-slate-100 dark:border-gray-700 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center">
                      <h3 className="font-semibold text-slate-800 dark:text-gray-100">Notifications</h3>
                      <button onClick={() => setIsNotifOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-sm">
                          No new notifications
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div key={notif.id} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-gray-700 border-b border-slate-50 dark:border-gray-700 last:border-0">
                            <div className="flex justify-between items-start mb-1">
                              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded
                                ${notif.type === 'Alert' ? 'bg-red-100 text-red-700' :
                                  // notif.type === 'Warning' ? 'bg-green-100 text-green-700' :
                                  notif.type === 'Warning' ? 'bg-yellow-100 text-yellow-700' :
                                    notif.type === 'Success' ? 'bg-green-100 text-green-700' :
                                      'bg-blue-100 text-blue-700'}`}>
                                {notif.type}
                              </span>
                              <span className="text-xs text-slate-400">
                                {new Date(notif.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <h4 className="text-sm font-medium text-slate-800 dark:text-gray-200 mb-0.5">{notif.title}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed mb-1">{notif.message}</p>
                            {notif.User && (
                              <p className="text-[10px] text-slate-400">From: {notif.User.email}</p>
                            )}
                            {notif.isLowStock && (
                              <button
                                onClick={() => {
                                  navigate('/inventory');
                                  setIsNotifOpen(false);
                                }}
                                className="mt-2 px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded-md hover:bg-orange-600"
                              >
                                Reorder Now
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile */}
              <div className="flex items-center space-x-3">
                <img
                  src={userData?.logo || `https://ui-avatars.com/api/?name=${userData?.businessName || 'A'}&background=0D8ABC&color=fff&font-size=0.5`}
                  alt="Profile"
                  className="w-9 h-9 rounded-full border-2 border-transparent hover:border-blue-500"
                />
                <div className="text-right hidden sm:block">
                  <p className="font-semibold text-sm text-slate-700 dark:text-gray-200">
                    {userData?.businessName || "Admin User"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {userData?.role || "Administrator"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="text-slate-800 p-4 relative min-h-[calc(100vh-4rem)] max-w-7xl mx-auto">
          {children}

        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
