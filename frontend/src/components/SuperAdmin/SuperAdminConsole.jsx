import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Building2, ChevronDown, Gauge, LayoutDashboard, LifeBuoy, LogOut, Menu, Settings, Tag, X } from "lucide-react";
import { useSuperAdminAuth } from "../../contexts/SuperAdminAuthContext";
import Overview from "./Overview";
import Stores from "./Stores";
import StoreDetail from "./StoreDetail";
import DataExplorer from "./DataExplorer";
import PlansView from "./PlansView";
import SupportView from "./SupportView";
import SettingsView from "./SettingsView";
import StorePicker, { ALL_STORES, StoreSwitcher } from "./StorePicker";
import { GROUP_ICONS, GROUP_ORDER } from "./datasetGroups";
import { ThemeToggle } from "./theme";
import { BrandMark, STORE_KEY, Spinner, fmtNumber, saRequest } from "./shared";

const readTenant = () => {
  try {
    return sessionStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
};
const writeTenant = (value) => {
  try {
    if (value) sessionStorage.setItem(STORE_KEY, value);
    else sessionStorage.removeItem(STORE_KEY);
  } catch {
    /* storage unavailable */
  }
};

// Platform console for the super admin (login: /superadmin/login).
// After login the super admin picks a workspace: one store (every screen is
// then scoped to it) or "All stores" (platform-wide view). The choice lives
// in sessionStorage; the screen inside it lives in the URL (?view=&ds=&store=).
export default function SuperAdminConsole() {
  const { email, logout } = useSuperAdminAuth();
  const [params, setParams] = useSearchParams();
  const view = params.get("view") || "overview";
  const dsKey = params.get("ds");

  const [tenant, setTenant] = useState(readTenant);
  const [datasets, setDatasets] = useState([]);
  const [stores, setStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storesError, setStoresError] = useState("");
  const [pendingSupport, setPendingSupport] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  const isAll = tenant === ALL_STORES;
  const tenantStore = !isAll ? stores.find((s) => s.id === tenant) : null;
  // In a store workspace the scope is fixed; in "All stores" the data tables
  // can still be filtered to one store via ?store=.
  const scopeStoreId = isAll ? params.get("store") : tenant;

  const go = useCallback(
    (next) => {
      const p = new URLSearchParams();
      Object.entries(next).forEach(([k, v]) => v && p.set(k, v));
      setParams(p);
      setMenuOpen(false);
      window.scrollTo(0, 0);
    },
    [setParams]
  );

  const selectTenant = useCallback(
    (id) => {
      writeTenant(id);
      setTenant(id);
      setDatasets([]);
      go({});
    },
    [go]
  );

  const loadStores = useCallback(() => {
    setStoresLoading(true);
    setStoresError("");
    saRequest("stores")
      .then(setStores)
      .catch((err) => setStoresError(err.message))
      .finally(() => setStoresLoading(false));
  }, []);

  const loadDatasets = useCallback(() => {
    if (!tenant) return;
    saRequest("datasets", { params: isAll ? {} : { storeId: tenant } })
      .then(setDatasets)
      .catch(() => setDatasets([]));
  }, [tenant, isAll]);

  const loadPendingSupport = useCallback(() => {
    if (!tenant) return;
    saRequest("support-requests", { params: { status: "Pending" } })
      .then((list) => setPendingSupport((isAll ? list : list.filter((r) => r.ownerId === tenant)).length))
      .catch(() => {});
  }, [tenant, isAll]);

  useEffect(loadStores, [loadStores]);
  useEffect(loadDatasets, [loadDatasets]);
  useEffect(loadPendingSupport, [loadPendingSupport]);

  // A remembered store that has since been deleted -> back to the picker.
  useEffect(() => {
    if (!storesLoading && !storesError && tenant && !isAll && !stores.some((s) => s.id === tenant)) {
      writeTenant(null);
      setTenant(null);
    }
  }, [stores, storesLoading, storesError, tenant, isAll]);

  const dataset = useMemo(() => datasets.find((d) => d.key === dsKey), [datasets, dsKey]);
  const openDataset = useCallback((key, store) => go({ view: "data", ds: key, store: isAll ? store : undefined }), [go, isAll]);

  const handleLogout = () => {
    writeTenant(null);
    logout();
  };

  const refreshAll = () => {
    loadStores();
    loadDatasets();
    loadPendingSupport();
  };

  if (!tenant) {
    return <StorePicker stores={stores} loading={storesLoading} error={storesError} onRetry={loadStores} onSelect={selectTenant} onLogout={handleLogout} />;
  }

  const navItem = (active, onClick, Icon, label, count, alert = false) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
        active
          ? "bg-emerald-50 sa-dark:bg-emerald-500/15 text-emerald-700 sa-dark:text-emerald-200"
          : "text-gray-500 sa-dark:text-slate-400 hover:text-gray-900 sa-dark:hover:text-slate-100 hover:bg-gray-100 sa-dark:hover:bg-slate-800/60"
      }`}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      <span className="flex-1 text-left truncate">{label}</span>
      {alert
        ? count > 0 && <span className="min-w-[20px] px-1.5 rounded-full bg-rose-500 text-white text-[11px] leading-5 text-center tabular-nums">{count > 99 ? "99+" : count}</span>
        : count !== undefined && count !== null && <span className="text-xs tabular-nums text-gray-500 sa-dark:text-slate-500">{fmtNumber(count)}</span>}
    </button>
  );

  const sidebar = (
    <nav className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-gray-200 sa-dark:border-slate-800 shrink-0">
        <BrandMark />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 sa-dark:text-white leading-tight">Super Admin</p>
          <p className="text-xs text-gray-500 sa-dark:text-slate-500 leading-tight truncate">{isAll ? "All stores" : tenantStore?.name || "SwordNex Billing"}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <div className="space-y-0.5">
          {isAll ? (
            <>
              {navItem(view === "overview", () => go({ view: "overview" }), Gauge, "Overview")}
              {navItem(view === "stores", () => go({ view: "stores" }), Building2, "Stores", stores.length)}
              {navItem(view === "plans", () => go({ view: "plans" }), Tag, "Subscription plans")}
            </>
          ) : (
            navItem(view === "overview", () => go({ view: "overview" }), LayoutDashboard, "Dashboard")
          )}
          {navItem(view === "support", () => go({ view: "support" }), LifeBuoy, "Support requests", pendingSupport, true)}
          {isAll && navItem(view === "settings", () => go({ view: "settings" }), Settings, "Platform settings")}
        </div>
        {GROUP_ORDER.map((group) => {
          const items = datasets.filter((d) => d.group === group);
          if (items.length === 0) return null;
          const Icon = GROUP_ICONS[group];
          const isCollapsed = collapsed[group];
          return (
            <div key={group}>
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [group]: !c[group] }))}
                className="w-full flex items-center gap-2 px-3 mb-1 text-[11px] uppercase tracking-wider text-gray-500 sa-dark:text-slate-500 hover:text-gray-700 sa-dark:hover:text-slate-300"
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="flex-1 text-left">{group}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition ${isCollapsed ? "-rotate-90" : ""}`} />
              </button>
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {items.map((d) => (
                    <div key={d.key}>{navItem(view === "data" && dsKey === d.key, () => openDataset(d.key, view === "data" ? scopeStoreId : null), null, d.label, d.count)}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );

  let content;
  if (!isAll && !tenantStore) {
    content = storesLoading ? <Spinner label="Loading store..." /> : null;
  } else if (view === "support") {
    content = <SupportView key={tenant} storeId={isAll ? null : tenant} onOpenStore={selectTenant} onChanged={loadPendingSupport} />;
  } else if (view === "data" && dsKey) {
    content = !datasets.length ? (
      <Spinner />
    ) : dataset ? (
      <DataExplorer key={tenant} dataset={dataset} storeId={scopeStoreId} stores={stores} onStoreChange={isAll ? (id) => openDataset(dsKey, id) : null} />
    ) : (
      <p className="py-16 text-center text-sm text-gray-500 sa-dark:text-slate-400">Unknown data set.</p>
    );
  } else if (!isAll) {
    content = (
      <StoreDetail
        key={tenant}
        storeId={tenant}
        datasets={datasets}
        onOpenDataset={(key) => openDataset(key)}
        onChanged={refreshAll}
        onDeleted={() => {
          loadStores();
          selectTenant(ALL_STORES);
        }}
      />
    );
  } else if (view === "stores") {
    content = <Stores stores={stores} loading={storesLoading} error={storesError} onReload={refreshAll} onOpenStore={selectTenant} />;
  } else if (view === "plans") {
    content = <PlansView />;
  } else if (view === "settings") {
    content = <SettingsView />;
  } else {
    content = <Overview onOpenStore={selectTenant} onOpenDataset={(key) => openDataset(key)} onOpenSupport={() => go({ view: "support" })} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 sa-dark:bg-slate-950 text-gray-800 sa-dark:text-slate-200">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-gray-50 sa-dark:bg-slate-950 border-r border-gray-200 sa-dark:border-slate-800 z-30">{sidebar}</aside>

      {/* Mobile sidebar */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30 sa-dark:bg-black/60" onClick={() => setMenuOpen(false)} />
          <aside className="relative w-72 max-w-[85%] h-full bg-gray-50 sa-dark:bg-slate-950 border-r border-gray-200 sa-dark:border-slate-800">
            <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="absolute top-4 right-3 p-1.5 text-gray-500 sa-dark:text-slate-400 hover:text-gray-900 sa-dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 h-16 flex items-center gap-3 px-4 sm:px-6 bg-white/90 sa-dark:bg-slate-950/90 backdrop-blur border-b border-gray-200 sa-dark:border-slate-800">
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="lg:hidden p-2 -ml-2 text-gray-700 sa-dark:text-slate-300 hover:text-gray-900 sa-dark:hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <StoreSwitcher stores={stores} tenant={tenant} onSelect={selectTenant} />
          <div className="flex-1" />
          <span className="hidden md:block text-sm text-gray-500 sa-dark:text-slate-400 truncate">{email}</span>
          <ThemeToggle />
          <button onClick={handleLogout} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 sa-dark:text-slate-300 hover:text-gray-900 sa-dark:hover:text-white hover:bg-gray-100 sa-dark:hover:bg-slate-800">
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
          </button>
        </header>
        <main className="px-4 sm:px-6 py-6 max-w-[1600px]">{content}</main>
      </div>
    </div>
  );
}
