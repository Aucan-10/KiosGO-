import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, ReactNode } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { useColors } from '../lib/theme';

export default function RootLayout() {
  const colors = useColors();
  return (
    <AuthProvider>
      <CartProvider>
        <AuthGate>
          <Stack
            screenOptions={{
              headerShown: true,
              // La barra superior sigue el modo claro/oscuro
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
              headerTitleStyle: { color: colors.text },
            }}
          />
        </AuthGate>
        <StatusBar style="auto" />
      </CartProvider>
    </AuthProvider>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
