import { useMemo, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useCart, CartItem } from '../context/CartContext';
import { formatPrice } from '../lib/types';
import { Colors, useColors } from '../lib/theme';

export default function CartScreen() {
  const { items, changeQuantity, removeFromCart, clearCart, total } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // El servidor valida stock y precios; el carrito solo envía id y cantidad
  async function reserveOrder() {
    if (items.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const payload = items.map((item) => ({ product_id: item.id, quantity: item.quantity }));
      const { error } = await supabase.rpc('place_order', { p_items: payload });

      if (error) {
        Alert.alert('No se pudo reservar', error.message);
        return;
      }

      clearCart();
      Alert.alert(
        '¡Pedido reservado!',
        'Pasá a retirarlo por el kiosco. El pago se realiza en el kiosco al retirar.',
        [{ text: 'Ver mis pedidos', onPress: () => router.replace('/orders') }]
      );
    } catch {
      Alert.alert('Error de conexión', 'Revisá tu conexión e intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.card}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]} />
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.unitPrice}>{formatPrice(item.price)} c/u</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity style={styles.qtyButton} onPress={() => changeQuantity(item.id, -1)}>
            <Text style={styles.qtyButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qty}>{item.quantity}</Text>
          <TouchableOpacity
            style={[styles.qtyButton, item.quantity >= item.stock && styles.qtyButtonDisabled]}
            disabled={item.quantity >= item.stock}
            onPress={() => changeQuantity(item.id, 1)}
          >
            <Text style={styles.qtyButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => removeFromCart(item.id)}>
          <Text style={styles.remove}>Eliminar</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.lineTotal}>{formatPrice(item.price * item.quantity)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Carrito' }} />

      {items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Tu carrito está vacío.</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/')}>
            <Text style={styles.secondaryButtonText}>Ir al menú</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatPrice(total)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
              onPress={reserveOrder}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Reservar pedido</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyText: { fontSize: 16, color: c.textMuted, marginBottom: 16 },
    list: { padding: 16 },
    card: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: 12,
      marginBottom: 12,
      padding: 10,
      alignItems: 'center',
    },
    image: { width: 70, height: 70, borderRadius: 8 },
    imagePlaceholder: { backgroundColor: c.placeholderBg },
    info: { flex: 1, marginLeft: 12 },
    name: { fontSize: 15, fontWeight: 'bold', color: c.text },
    unitPrice: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    qtyButton: {
      backgroundColor: c.primary,
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyButtonDisabled: { backgroundColor: c.primaryDisabled },
    qtyButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', lineHeight: 20 },
    qty: { marginHorizontal: 12, fontSize: 16, fontWeight: '600', color: c.text },
    remove: { color: c.danger, marginTop: 6, fontSize: 13 },
    lineTotal: { fontWeight: 'bold', fontSize: 15, marginLeft: 8, color: c.text },
    footer: { padding: 16, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    totalLabel: { fontSize: 18, fontWeight: 'bold', color: c.text },
    totalValue: { fontSize: 18, fontWeight: 'bold', color: c.success },
    primaryButton: { backgroundColor: c.primary, padding: 15, borderRadius: 10, alignItems: 'center' },
    primaryButtonDisabled: { backgroundColor: c.primaryDisabledSoft },
    primaryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    secondaryButton: { backgroundColor: c.primarySoft, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    secondaryButtonText: { color: c.primary, fontWeight: '600' },
  });
