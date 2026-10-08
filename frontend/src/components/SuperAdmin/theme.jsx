import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// Super admin light/dark theme. Independent of the rest of the app (whose
// "dark" class follows the user's own setting): the console's dark styles use
// the custom "sa-dark:" Tailwind variant (tailwind.config.js), active inside a
// .sa-dark wrapper. The choice is remembered per browser; dark is the default.
const STORAGE_KEY = "superAdminTheme";
const EVENT = "superadmin-theme-change";

const readTheme = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

export function useSuperAdminTheme() {
  const [theme, setThemeState] = useState(readTheme);

  // Keep every mounted user of the hook (login, picker, console, charts) in sync.
  useEffect(() => {
    const sync = () => setThemeState(readTheme());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  const setTheme = useCallback((next) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable - theme still changes for this page view */
    }
    setThemeState(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const toggle = useCallback(() => setTheme(readTheme() === "dark" ? "light" : "dark"), [setTheme]);
  return { theme, isDark: theme === "dark", setTheme, toggle };
}

// Wrap a super admin screen so its sa-dark: classes apply in dark mode.
export function ThemeScope({ children }) {
  const { isDark } = useSuperAdminTheme();
  return <div className={isDark ? "sa-dark" : undefined}>{children}</div>;
}

export function ThemeToggle({ className = "" }) {
  const { isDark, toggle } = useSuperAdminTheme();
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 sa-dark:text-slate-400 sa-dark:hover:text-white sa-dark:hover:bg-slate-800 transition ${className}`}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
