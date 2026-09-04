import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

const ThemeToggle = ({ className = "" }) => {
    const { theme, setTheme } = useTheme();

    return (
        <div className={`flex items-center gap-2 p-1 bg-slate-100 dark:bg-gray-800 rounded-full border border-slate-200 dark:border-gray-700 ${className}`}>
            <button
                onClick={() => setTheme('light')}
                className={`p-2 rounded-full transition-all ${theme === 'light'
                        ? 'bg-white text-green-500 shadow-sm dark:bg-gray-700'
                        : 'text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300'
                    }`}
                title="Light Mode"
            >
                <Sun className="w-4 h-4" />
            </button>
            <button
                onClick={() => setTheme('dark')}
                className={`p-2 rounded-full transition-all ${theme === 'dark'
                        ? 'bg-white text-blue-500 shadow-sm dark:bg-gray-700 dark:text-blue-400'
                        : 'text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300'
                    }`}
                title="Dark Mode"
            >
                <Moon className="w-4 h-4" />
            </button>
            <button
                onClick={() => setTheme('system')}
                className={`p-2 rounded-full transition-all ${theme === 'system'
                        ? 'bg-white text-slate-700 shadow-sm dark:bg-gray-700 dark:text-gray-200'
                        : 'text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300'
                    }`}
                title="System Default"
            >
                <Monitor className="w-4 h-4" />
            </button>
        </div>
    );
};

export default ThemeToggle;
