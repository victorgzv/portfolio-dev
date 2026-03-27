import { create } from 'zustand';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  overlay: string;
  card: string;
  notification: string;
}

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  systemTheme: ColorSchemeName;
  // Actions
  setTheme: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  initializeTheme: () => Promise<void>;
}

// Light theme colors
const lightColors: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F9FAFB',
  primary: '#3B82F6',
  primaryDark: '#1D4ED8',
  secondary: '#6B7280',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  overlay: 'rgba(0, 0, 0, 0.5)',
  card: '#FFFFFF',
  notification: '#EF4444',
};

// Dark theme colors
const darkColors: ThemeColors = {
  background: '#111827',
  surface: '#1F2937',
  primary: '#60A5FA',
  primaryDark: '#3B82F6',
  secondary: '#9CA3AF',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  border: '#374151',
  error: '#F87171',
  success: '#34D399',
  warning: '#FBBF24',
  info: '#60A5FA',
  overlay: 'rgba(0, 0, 0, 0.7)',
  card: '#1F2937',
  notification: '#F87171',
};

const THEME_STORAGE_KEY = '@theme_mode';

const getColorsForTheme = (isDark: boolean): ThemeColors => {
  return isDark ? darkColors : lightColors;
};

const getSystemTheme = (): ColorSchemeName => {
  return Appearance.getColorScheme();
};

const getEffectiveTheme = (mode: ThemeMode, systemTheme: ColorSchemeName): boolean => {
  if (mode === 'system') {
    return systemTheme === 'dark';
  }
  return mode === 'dark';
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  isDark: false,
  colors: lightColors,
  systemTheme: null,

  initializeTheme: async () => {
    try {
      // Get stored theme preference
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const mode: ThemeMode = (storedTheme as ThemeMode) || 'system';
      
      // Get system theme
      const systemTheme = getSystemTheme();
      
      // Calculate effective theme
      const isDark = getEffectiveTheme(mode, systemTheme);
      const colors = getColorsForTheme(isDark);

      set({
        mode,
        isDark,
        colors,
        systemTheme,
      });

      // Listen for system theme changes
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        const currentState = get();
        if (currentState.mode === 'system') {
          const newIsDark = colorScheme === 'dark';
          const newColors = getColorsForTheme(newIsDark);
          
          set({
            systemTheme: colorScheme,
            isDark: newIsDark,
            colors: newColors,
          });
        } else {
          set({ systemTheme: colorScheme });
        }
      });

      // Store subscription for cleanup if needed
      return subscription;
    } catch (error) {
      console.error('Error initializing theme:', error);
    }
  },

  setTheme: async (mode: ThemeMode) => {
    try {
      const { systemTheme } = get();
      const isDark = getEffectiveTheme(mode, systemTheme);
      const colors = getColorsForTheme(isDark);

      // Save to storage
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);

      set({
        mode,
        isDark,
        colors,
      });
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  },

  toggleTheme: async () => {
    const { mode } = get();
    let newMode: ThemeMode;

    // Cycle through: light -> dark -> system -> light
    switch (mode) {
      case 'light':
        newMode = 'dark';
        break;
      case 'dark':
        newMode = 'system';
        break;
      case 'system':
      default:
        newMode = 'light';
        break;
    }

    await get().setTheme(newMode);
  },
}));