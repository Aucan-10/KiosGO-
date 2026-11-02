import { useColorScheme } from 'react-native';

// Paleta de colores. Sigue el modo claro/oscuro del sistema (userInterfaceStyle: automatic).
export const lightColors = {
  background: '#f5f5f5',
  surface: '#ffffff',
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
  background: '#121212',
  surface: '#1E1E1E',
  border: '#333333',
  inputBorder: '#555555',
  placeholderBg: '#2C2C2E',
  text: '#F2F2F7',
  textMuted: '#A1A1AA',
  textFaint: '#8E8E93',
  primary: '#0A84FF',
  primarySoft: '#1C2F4A',
  primaryDisabled: '#48484A',
  primaryDisabledSoft: '#2C4A6B',
  danger: '#FF453A',
  dangerSoft: '#4A1F1D',
  success: '#30D158',
  successSoft: '#1B3A24',
  successText: '#30D158',
  warning: '#FFB340',
  greenDisabled: '#2F5E3D',
};

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? darkColors : lightColors;
}
