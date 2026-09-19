import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Building2, Users, LifeBuoy, ShieldCheck, LogOut } from "lucide-react";
import { useSuperAdminAuth } from "../../contexts/SuperAdminAuthContext";

const navItems = [
  { to: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/superadmin/tenants", label: "Tenants", icon: Building2 },
  { to: "/superadmin/subusers", label: "Sub-Users", icon: Users },
  { to: "/superadmin/support", label: "Support", icon: LifeBuoy },
];

const SuperAdminLayout = ({ children }) => {
  const { email, logout } = useSuperAdminAuth();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      <aside className="w-60 shrink-0 border-r border-gray-800 flex flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-gray-800">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <span className="font-semibold text-sm">Super Admin</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? "bg-emerald-600/15 text-emerald-400"
                    : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <div className="px-3 py-2 text-xs text-gray-500 truncate">{email}</div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-900 hover:text-red-400 transition"
          >
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
