import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, ReactNode } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <AuthGate>
          <Stack screenOptions={{ headerShown: true }} />
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
    const onAuthScreen = segments[0] === 'login' || segments[0] === 'register';
    if (!session && !onAuthScreen) {
      router.replace('/login');
    } else if (session && onAuthScreen) {
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
