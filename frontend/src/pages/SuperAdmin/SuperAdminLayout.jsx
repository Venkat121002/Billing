import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Building2, Users, LifeBuoy, ShieldCheck, LogOut, Tag, Sun, Moon, Settings } from "lucide-react";
import { useSuperAdminAuth } from "../../contexts/SuperAdminAuthContext";
import { useTheme } from "../../contexts/ThemeContext";

const navItems = [
  { to: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/superadmin/tenants", label: "Tenants", icon: Building2 },
  { to: "/superadmin/subusers", label: "Sub-Users", icon: Users },
  { to: "/superadmin/plans", label: "Plans", icon: Tag },
  { to: "/superadmin/support", label: "Support", icon: LifeBuoy },
  { to: "/superadmin/settings", label: "Settings", icon: Settings },
];

const SuperAdminLayout = ({ children }) => {
  const { email, logout } = useSuperAdminAuth();
  const { theme, setTheme } = useTheme();

  // Explicit opt-in only — "system"/unset/"dark" all render the panel's usual
  // dark look, exactly as before this toggle existed. Only an explicit click
  // switches it to light, so nobody's OS preference silently changes this.
  const isLight = theme === "light";
  const toggleTheme = () => setTheme(isLight ? "dark" : "light");

  // Only this sidebar/header chrome responds to the toggle for now — the
  // page content below (Dashboard, Tenants, Plans, etc.) is still dark-only,
  // so light mode will look part-finished until those are themed too.
  const shell = isLight ? "min-h-screen bg-gray-50 text-gray-900 flex" : "min-h-screen bg-gray-950 text-gray-100 flex";
  const aside = isLight ? "w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col" : "w-60 shrink-0 border-r border-gray-800 flex flex-col";
  const headerRow = isLight ? "h-16 flex items-center justify-between gap-2 px-5 border-b border-gray-200" : "h-16 flex items-center justify-between gap-2 px-5 border-b border-gray-800";
  const themeBtn = isLight
    ? "h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition"
    : "h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-900 hover:text-gray-100 transition";
  const navActive = "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition bg-emerald-600/15 text-emerald-400";
  const navInactive = isLight
    ? "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition text-gray-500 hover:bg-gray-100 hover:text-gray-900"
    : "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition text-gray-400 hover:bg-gray-900 hover:text-gray-200";
  const footer = isLight ? "p-3 border-t border-gray-200" : "p-3 border-t border-gray-800";
  const footerEmail = isLight ? "px-3 py-2 text-xs text-gray-500 truncate" : "px-3 py-2 text-xs text-gray-500 truncate";
  const logoutBtn = isLight
    ? "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-red-600 transition"
    : "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-900 hover:text-red-400 transition";

  return (
    <div className={shell}>
      <aside className={aside}>
        <div className={headerRow}>
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
            <span className="font-semibold text-sm truncate">Super Admin</span>
          </div>
          <button
            onClick={toggleTheme}
            className={themeBtn}
            title={isLight ? "Switch to dark theme" : "Switch to light theme"}
          >
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? navActive : navInactive)}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className={footer}>
          <div className={footerEmail}>{email}</div>
          <button onClick={logout} className={logoutBtn}>
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;
