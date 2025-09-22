"use client";

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: string; // applied data-theme value
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ClientThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [actualTheme, setActualTheme] = useState<string>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Get saved theme from localStorage
    try {
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') setThemeState(savedTheme);
      else setThemeState('system');
    } catch (e) {
      // Ignore localStorage errors
      console.warn('Could not access localStorage for theme:', e);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const updateActualTheme = () => {
      let mode = theme;
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        mode = prefersDark ? 'dark' : 'light';
      }
      setActualTheme(mode);
      document.documentElement.dataset.theme = mode;
    };

    // Delay theme application to avoid hydration mismatch
    const timeoutId = setTimeout(updateActualTheme, 200);

    // Listen for system theme changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateActualTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        clearTimeout(timeoutId);
        mediaQuery.removeEventListener('change', handleChange);
      };
    }

    return () => clearTimeout(timeoutId);
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('theme', newTheme);
    } catch (e) {
      console.warn('Could not save theme to localStorage:', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return default values instead of throwing error
    return { theme: 'light' as Theme, setTheme: () => {}, actualTheme: 'light' } as ThemeContextType;
  }
  return context;
}
