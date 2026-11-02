import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { OrderRow, STATUS_LABELS, formatDate, formatPrice, statusStyle } from '../lib/types';
import { Colors, useColors } from '../lib/theme';

export default function MyOrdersScreen() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
        <Text style={[styles.status, statusStyle(item.status, colors)]}>{STATUS_LABELS[item.status]}</Text>
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
        <ActivityIndicator size="large" color={colors.primary} />
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

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
    list: { padding: 16 },
    card: { backgroundColor: c.surface, borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    orderDate: { color: c.textMuted, fontSize: 13 },
    status: { fontWeight: 'bold', fontSize: 13 },
    line: { fontSize: 14, color: c.text, marginBottom: 2 },
    total: { marginTop: 8, fontWeight: 'bold', fontSize: 15, textAlign: 'right', color: c.text },
    empty: { textAlign: 'center', marginTop: 40, color: c.textFaint, fontSize: 16, paddingHorizontal: 20 },
  });
