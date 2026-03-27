import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useThemeStore } from '../../store/themeStore';

interface ThemeContextType {
  isDark: boolean;
  colors: any;
  toggleTheme: () => Promise<void>;
  setTheme: (mode: 'light' | 'dark' | 'system') => Promise<void>;
  mode: 'light' | 'dark' | 'system';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { isDark, colors, toggleTheme, setTheme, mode, initializeTheme } = useThemeStore();

  useEffect(() => {
    initializeTheme();
  }, []);

  const contextValue: ThemeContextType = {
    isDark,
    colors,
    toggleTheme,
    setTheme,
    mode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};