import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// MedMentor Brand Guidelines 2026
const LIGHT_COLORS = {
  background: '#F8FAFB', // Soft White
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  text: '#14213D', // Navy Blue
  textSecondary: '#6B7280', // Neutral Gray
  textTertiary: '#9CA3AF',
  primary: '#0D7377', // Brand Teal
  primaryLight: '#E6F4F5', // Light Teal
  secondary: '#00B4D8', // Cyan Accent
  border: '#E5E7EB',
  card: '#FFFFFF',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#00B4D8', // Cyan Accent
  inputBg: '#F3F4F6',
  headerBg: '#0D7377', // Brand Teal
  headerText: '#FFFFFF',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  kpiPrimary: '#0D7377',
  kpiSecondary: '#14213D',
  kpiSuccess: '#10B981',
  kpiInfo: '#00B4D8',
};

const DARK_COLORS = {
  background: '#0F172A', // Slate 900
  surface: '#1E293B', // Slate 800
  surfaceVariant: '#334155',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  primary: '#0D7377', // Keep Brand Teal
  primaryLight: '#115E59', // Darker Teal for dark mode backgrounds
  secondary: '#00B4D8', // Cyan Accent
  border: '#334155',
  card: '#1E293B',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#00B4D8',
  inputBg: '#334155',
  headerBg: '#0D7377', // Or Navy #14213D
  headerText: '#FFFFFF',
  tabBarBg: '#1E293B',
  tabBarBorder: '#334155',
  kpiPrimary: '#0D7377',
  kpiSecondary: '#8B5CF6',
  kpiSuccess: '#10B981',
  kpiInfo: '#06B6D4',
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
  }, [isDark, colors]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors, paperTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
