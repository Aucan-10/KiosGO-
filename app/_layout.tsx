import { Stack, useRouter, useSegments, useRootNavigationState, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, ReactNode } from 'react';
import { ActivityIndicator, View, StyleSheet, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CartProvider, useCart } from '../context/CartContext';
import { useColors } from '../lib/theme';
import BottomBar, { TAB_PATHS, getTabs } from '../components/BottomBar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <AuthGate>
          <AppShell />
        </AuthGate>
        <StatusBar style="auto" />
      </CartProvider>
    </AuthProvider>
  );
}

// Pantallas del stack, barra inferior y gesto de deslizar entre las secciones principales
function AppShell() {
  const colors = useColors();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, isAdmin } = useAuth();
  const { itemCount } = useCart();

  const showBar = !!session && TAB_PATHS.includes(pathname);
  const tabPaths = getTabs(isAdmin, itemCount).map((tab) => tab.path);

  // Deslizar a la izquierda pasa a la sección siguiente; a la derecha, a la anterior.
  // Solo reacciona a gestos mayormente horizontales, para no interferir con el scroll vertical.
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => showBar && Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderRelease: (_, g) => {
      if (!showBar || Math.abs(g.dx) < 60) return;
      const index = tabPaths.indexOf(pathname);
      if (index === -1) return;
      const next = g.dx < 0 ? index + 1 : index - 1;
      if (next < 0 || next >= tabPaths.length) return;
      router.replace(tabPaths[next] as '/');
    },
  });

  return (
    <View style={[styles.shell, { backgroundColor: colors.background, paddingBottom: showBar ? 0 : insets.bottom }]}>
      <View style={styles.stack} {...(showBar ? panResponder.panHandlers : {})}>
        <Stack
          screenOptions={{
            headerShown: true,
            // La barra superior sigue el modo claro/oscuro
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerTitleStyle: { color: colors.text },
          }}
        />
      </View>
      {showBar && <BottomBar />}
    </View>
  );
}

// Redirige según sesión: sin sesión -> login; con sesión -> home (no vuelve a login)
function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navState = useRootNavigationState();

  useEffect(() => {
    if (loading || !navState?.key) return;
    const first = segments[0] as string | undefined;
    const isAuthScreen = first === 'login' || first === 'register';
    // Recuperar contraseña debe poder abrirse sin sesión
    const isPublicScreen = isAuthScreen || first === 'forgot-password' || first === 'reset-password';
    if (!session && !isPublicScreen) {
      router.replace('/login');
    } else if (session && isAuthScreen) {
      router.replace('/');
    }
  }, [loading, session, segments, navState?.key]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  stack: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
