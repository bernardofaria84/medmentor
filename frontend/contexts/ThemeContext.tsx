import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

const LIGHT_COLORS = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceVariant: '#f1f5f9',
  text: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  primary: '#2563eb',
  primaryLight: '#dbeafe',
  border: '#e2e8f0',
  card: '#ffffff',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#0891b2',
  inputBg: '#f5f5f5',
  headerBg: '#2563eb',
  headerText: '#ffffff',
  tabBarBg: '#ffffff',
  tabBarBorder: '#e2e8f0',
  kpiPrimary: '#2563eb',
  kpiSecondary: '#7c3aed',
  kpiSuccess: '#059669',
  kpiInfo: '#0891b2',
};

const DARK_COLORS = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceVariant: '#334155',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
  primary: '#3b82f6',
  primaryLight: '#1e3a5f',
  border: '#334155',
  card: '#1e293b',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#0891b2',
  inputBg: '#334155',
  headerBg: '#1e293b',
  headerText: '#f1f5f9',
  tabBarBg: '#1e293b',
  tabBarBorder: '#334155',
  kpiPrimary: '#3b82f6',
  kpiSecondary: '#8b5cf6',
  kpiSuccess: '#10b981',
  kpiInfo: '#06b6d4',
};

export type AppColors = typeof LIGHT_COLORS;

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: AppColors;
  paperTheme: typeof MD3LightTheme;
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const useAppTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('theme_mode').then(val => {
      if (val === 'dark') setIsDark(true);
    });
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem('theme_mode', next ? 'dark' : 'light');
      return next;
    });
  };

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const paperTheme = useMemo(() => {
    const base = isDark ? MD3DarkTheme : MD3LightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        secondary: colors.textSecondary,
        background: colors.background,
        surface: colors.surface,
        surfaceVariant: colors.surfaceVariant,
        error: colors.error,
        onPrimary: '#ffffff',
        onSurface: colors.text,
        onBackground: colors.text,
        outline: colors.border,
      },
    };
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors, paperTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
