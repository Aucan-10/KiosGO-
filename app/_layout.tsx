import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CartProvider } from '../context/CartContext'; // <-- Importamos el proveedor

export default function RootLayout() {
  return (
    <CartProvider> {/* <-- Envolver todo aquí */}
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </CartProvider>
  );
}