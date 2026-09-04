import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Menu,
  X,
  ChevronRight,
  Leaf,
  LogIn,
  Home,
  LayoutDashboard,
  BookOpen,
  Building2,
  Briefcase,
  Settings,
  User,
  FileText,
  ArrowRight,
  Sparkles,
  Users,
} from "lucide-react";

export default function BillingNavigationBar() {
  const { currentUser } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  const userData = currentUser || {};
  const isOwner = userData.role === 'owner';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMenuOpen]);

  const isActive = (path) => location.pathname === path;

  const desktopLinks = [
    { to: "/", label: "Home", icon: Home },
    { to: "/features", label: "Features", icon: Sparkles },
    { to: "/about", label: "About", icon: BookOpen },
    { to: "/contact", label: "Contact", icon: Building2 },
  ];

  const mobileLinks = [
    { to: "/", label: "Home", icon: Home, desc: "Back to homepage" },
    { to: "/features", label: "Features", icon: Sparkles, desc: "Explore all features" },
    { to: "/about", label: "About Us", icon: BookOpen, desc: "Learn about our mission" },
    { to: "/contact", label: "Contact", icon: Building2, desc: "Get in touch with us" },
  ];

  const mobileSecondaryLinks = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/profile", label: "Profile", icon: User },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
          ? "bg-white/90 backdrop-blur-xl shadow-[0_1px_20px_rgba(16,185,129,0.08)] border-b border-green-100"
          : "bg-white/70 backdrop-blur-md"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[72px]">
            {/* ═══ Logo ═══ */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <div className="w-6 h-6 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-200 group-hover:shadow-green-300 transition-shadow duration-300">
                  <Leaf className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                  ERP
                </span>
                <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-[0.2em] -mt-0.5 hidden sm:block">
                  Business Suite
                </span>
              </div>
            </Link>

            {/* ═══ Desktop Navigation ═══ */}
            <div className="hidden lg:flex items-center">
              {/* Nav Links */}
              <div className="flex items-center bg-green-50/60 rounded-2xl px-1.5 py-1.5 mr-4 border border-green-100/50">
                {desktopLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${isActive(link.to)
                      ? "bg-white text-green-700 shadow-sm shadow-green-100"
                      : "text-gray-600 hover:text-green-700 hover:bg-white/60"
                      }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <link.icon className="w-3.5 h-3.5" />
                      {link.label}
                    </span>
                    {isActive(link.to) && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-green-500 rounded-full" />
                    )}
                  </Link>
                ))}
              </div>

              {/* CTA Button */}
              <Link
                to="/employer/jobs"
                className="group relative inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-green-200 hover:shadow-xl hover:shadow-green-300 hover:from-green-600 hover:to-emerald-700 transition-all duration-300 overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <LogIn className="w-4 h-4 relative" />
                <span className="relative">Login</span>
              </Link>
            </div>

            {/* ═══ Mobile Menu Button ═══ */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`lg:hidden relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${isMenuOpen
                ? "bg-red-50 text-red-500"
                : "bg-green-50 text-green-600 hover:bg-green-100"
                }`}
              aria-label="Toggle menu"
            >
              <span
                className={`absolute transition-all duration-300 ${isMenuOpen
                  ? "rotate-0 opacity-100"
                  : "rotate-90 opacity-0"
                  }`}
              >
                <X className="w-5 h-5" />
              </span>
              <span
                className={`absolute transition-all duration-300 ${isMenuOpen
                  ? "-rotate-90 opacity-0"
                  : "rotate-0 opacity-100"
                  }`}
              >
                <Menu className="w-5 h-5" />
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ Mobile Menu Overlay ═══ */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-500 ${isMenuOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
          }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity duration-500 ${isMenuOpen ? "opacity-100" : "opacity-0"
            }`}
          onClick={() => setIsMenuOpen(false)}
        />

        {/* Menu Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-[85%] max-w-sm bg-white shadow-2xl transition-transform duration-500 ease-out ${isMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
        >
          <div className="flex flex-col h-full">
            {/* Menu Header */}
            <div className="px-6 pt-5 pb-4 border-b border-green-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <Leaf className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-extrabold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                    ERP
                  </span>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Welcome Card */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <p className="text-sm font-semibold text-gray-700">
                  Welcome back! 👋
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage your business efficiently
                </p>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto py-4 px-4">
              {/* Primary Links */}
              <div className="mb-6">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-3">
                  Navigation
                </p>
                <div className="space-y-1">
                  {mobileLinks.map((link, i) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group ${isActive(link.to)
                        ? "bg-green-50 border border-green-200"
                        : "hover:bg-gray-50"
                        }`}
                      style={{
                        animationDelay: `${i * 50}ms`,
                      }}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive(link.to)
                          ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-md shadow-green-200"
                          : "bg-gray-100 group-hover:bg-green-100"
                          }`}
                      >
                        <link.icon
                          className={`w-5 h-5 ${isActive(link.to)
                            ? "text-white"
                            : "text-gray-500 group-hover:text-green-600"
                            }`}
                        />
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-semibold ${isActive(link.to)
                            ? "text-green-700"
                            : "text-gray-800"
                            }`}
                        >
                          {link.label}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {link.desc}
                        </p>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 transition-all ${isActive(link.to)
                          ? "text-green-500"
                          : "text-gray-300 group-hover:text-green-400 group-hover:translate-x-0.5"
                          }`}
                      />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Secondary Links */}
              <div className="mb-6">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-3">
                  Account
                </p>
                <div className="space-y-1">
                  {mobileSecondaryLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${isActive(link.to)
                        ? "bg-green-50 border border-green-200"
                        : "hover:bg-gray-50"
                        }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive(link.to)
                          ? "bg-green-100"
                          : "bg-gray-100 group-hover:bg-green-50"
                          }`}
                      >
                        <link.icon
                          className={`w-4 h-4 ${isActive(link.to)
                            ? "text-green-600"
                            : "text-gray-500 group-hover:text-green-600"
                            }`}
                        />
                      </div>
                      <span
                        className={`text-sm font-medium ${isActive(link.to)
                          ? "text-green-700"
                          : "text-gray-700"
                          }`}
                      >
                        {link.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Menu Footer */}
            <div className="px-4 pb-6 pt-3 border-t border-green-100">
              <Link
                to="/employer/jobs"
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-green-200 hover:shadow-xl hover:shadow-green-300 transition-all active:scale-[0.98]"
              >
                <LogIn className="w-4 h-4" />
                Login to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>

              <p className="text-center text-[10px] text-gray-400 mt-3 font-medium">
                ERP Business Suite v2.0
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for fixed navbar */}
      <div className="h-16 lg:h-[72px]" />
    </>
  );
}