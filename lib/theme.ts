import { useColorScheme } from 'react-native';

// Paleta de colores de la app (no cambia el tema del celular).
// Sigue el modo claro/oscuro del sistema (userInterfaceStyle: automatic).
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
  textFaint: '#888888',
  primary: '#007AFF',
  primarySoft: '#E5F0FF',
  primaryDisabled: '#B0B0B0',
  primaryDisabledSoft: '#8DBEFF',
  danger: '#FF3B30',
  dangerSoft: '#FFE5E3',
  success: '#34C759',
  successSoft: '#E8F5E9',
  successText: '#2E7D32',
  warning: '#B26A00',
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

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? darkColors : lightColors;
}
