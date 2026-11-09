import { createContext, createElement, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Paleta de colores de la app (no cambia el tema del celular).
// La versión oscura se aproxima a la captura del diseño: fondo casi negro, tarjetas grises,
// precios verdes y botones celestes.
export const lightColors = {
  background: '#F6EFDD',
  surface: '#FCF8EE',
  border: '#eeeeee',
  inputBorder: '#cccccc',
  placeholderBg: '#eeeeee',
  text: '#222222',
  textMuted: '#666666',
  textFaint: '#666666',
  primary: '#0060C0',
  onPrimary: '#FFFFFF',
  primarySoft: '#E5F0FF',
  primaryDisabled: '#B0B0B0',
  primaryDisabledSoft: '#8DBEFF',
  danger: '#D70015',
  dangerSoft: '#FFE5E3',
  success: '#1F7A3A',
  successSoft: '#E8F5E9',
  successText: '#2E7D32',
  warning: '#8A5200',
  greenDisabled: '#9ADBA8',
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  background: '#141414',
  surface: '#222222',
  border: '#2E2E2E',
  inputBorder: '#4A4A4A',
  placeholderBg: '#2E2E2E',
  text: '#FFFFFF',
  textMuted: '#A3A3A3',
  textFaint: '#8C8C8C',
  primary: '#4DA3E0',
  onPrimary: '#141414',
  primarySoft: '#1F3440',
  primaryDisabled: '#4A4A4A',
  primaryDisabledSoft: '#3A5D6F',
  danger: '#FF5A5A',
  dangerSoft: '#3D2222',
  success: '#3CCB6A',
  successSoft: '#1B3626',
  successText: '#3CCB6A',
  warning: '#FFB84D',
  greenDisabled: '#2A5A3A',
};

// Preferencia de apariencia elegida por el usuario. Se guarda en el celular.
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREFERENCES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Seguir al sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

const THEME_STORAGE_KEY = 'kiosgo.themePreference';

type ThemeContextType = {
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
  isDark: boolean;
  colors: Colors;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Lee la preferencia guardada al iniciar la app
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') setPreferenceState(saved);
      })
      .catch(() => {
        // Si no se puede leer, queda "seguir al sistema"
      });
  }, []);

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    AsyncStorage.setItem(THEME_STORAGE_KEY, value).catch(() => {});
  }, []);

  const isDark = preference === 'dark' || (preference === 'system' && systemScheme === 'dark');

  const value = useMemo(
    () => ({ preference, setPreference, isDark, colors: isDark ? darkColors : lightColors }),
    [preference, setPreference, isDark]
  );

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useThemeSettings(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemeSettings debe usarse dentro de un ThemeProvider');
  return context;
}

export function useColors(): Colors {
  return useThemeSettings().colors;
}
