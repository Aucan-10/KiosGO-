import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { OrderRow, STATUS_LABELS, formatDate, formatPrice, statusStyle } from '../lib/types';

export default function MyOrdersScreen() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setError(null);
    // RLS: el alumno solo recibe sus propios pedidos
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at, order_items(quantity, unit_price, products(name))')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError('No pudimos cargar tus pedidos. Intentá de nuevo.');
    } else {
      setOrders((data ?? []) as unknown as OrderRow[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  const renderOrder = ({ item }: { item: OrderRow }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
        <Text style={[styles.status, statusStyle(item.status)]}>{STATUS_LABELS[item.status]}</Text>
      </View>
      {item.order_items.map((line, index) => (
        <Text key={index} style={styles.line}>
          {line.quantity} × {line.products?.name ?? 'Producto'} — {formatPrice(line.unit_price * line.quantity)}
        </Text>
      ))}
      <Text style={styles.total}>Total: {formatPrice(item.total_amount)}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Mis pedidos' }} />
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Mis pedidos' }} />
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchOrders();
            }}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>{error ?? 'Todavía no hiciste pedidos.'}</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderDate: { color: '#555', fontSize: 13 },
  status: { fontWeight: 'bold', fontSize: 13 },
  line: { fontSize: 14, color: '#222', marginBottom: 2 },
  total: { marginTop: 8, fontWeight: 'bold', fontSize: 15, textAlign: 'right' },
  empty: { textAlign: 'center', marginTop: 40, color: '#888', fontSize: 16, paddingHorizontal: 20 },
});
