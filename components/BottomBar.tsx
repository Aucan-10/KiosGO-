import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Colors, useColors } from '../lib/theme';

export type Tab = { label: string; icon: string; path: string };

// Secciones principales: se usan en la barra inferior y para deslizar entre ellas
export function getTabs(isAdmin: boolean, itemCount: number): Tab[] {
  if (isAdmin) {
    return [
      { label: 'Menú', icon: '🍽️', path: '/' },
      { label: 'Pedidos', icon: '🧾', path: '/admin/orders' },
      { label: 'Stock', icon: '📦', path: '/admin/products' },
      { label: 'Cuenta', icon: '👤', path: '/account' },
    ];
  }
  return [
    { label: 'Menú', icon: '🍽️', path: '/' },
    { label: itemCount > 0 ? `Carrito (${itemCount})` : 'Carrito', icon: '🛒', path: '/cart' },
    { label: 'Pedidos', icon: '🧾', path: '/orders' },
    { label: 'Cuenta', icon: '👤', path: '/account' },
  ];
}

// Rutas que muestran la barra inferior (las demás son formularios o pantallas de auth)
export const TAB_PATHS = ['/', '/cart', '/orders', '/account', '/admin/orders', '/admin/products'];

export default function BottomBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { itemCount } = useCart();
  const { isAdmin } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const tabs = getTabs(isAdmin, itemCount);

  return (
    // El padding inferior evita que la barra quede debajo de los botones del sistema
    <View style={[styles.bar, { paddingBottom: insets.bottom + 4 }]}>
      {tabs.map((tab) => {
        const active = pathname === tab.path;
        return (
          <TouchableOpacity
            key={tab.path}
            style={styles.tab}
            onPress={() => router.replace(tab.path as '/')}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.icon, !active && styles.iconInactive]}>{tab.icon}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 8,
    },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    icon: { fontSize: 22 },
    iconInactive: { opacity: 0.6 },
    label: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    labelActive: { color: c.primary, fontWeight: '700' },
  });
