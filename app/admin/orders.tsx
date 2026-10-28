import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  OrderRow,
  OrderStatus,
  STATUS_LABELS,
  NEXT_STATUSES,
  formatDate,
  formatPrice,
  statusStyle,
} from '../../lib/types';

export default function AdminOrdersScreen() {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setError(null);
    // Orden cronológico: primero lo más viejo, para preparar en orden
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select(
        'id, total_amount, status, created_at, profiles(full_name, email), order_items(quantity, unit_price, products(name))'
      )
      .order('created_at', { ascending: true });

    if (fetchError) {
      setError('No pudimos cargar los pedidos.');
    } else {
      setOrders((data ?? []) as unknown as OrderRow[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) fetchOrders();
      else setLoading(false);
    }, [isAdmin, fetchOrders])
  );

  async function changeStatus(order: OrderRow, next: OrderStatus) {
    setUpdatingId(order.id);
    const { error: updateError } = await supabase.from('orders').update({ status: next }).eq('id', order.id);
    setUpdatingId(null);

    if (updateError) {
      Alert.alert('Error', 'No se pudo actualizar el pedido.');
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)));
  }

  function confirmChange(order: OrderRow, next: OrderStatus) {
    if (next === 'cancelled') {
      Alert.alert('Cancelar pedido', '¿Seguro que querés cancelar este pedido? El stock no se devuelve automáticamente.', [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: () => changeStatus(order, next) },
      ]);
    } else {
      changeStatus(order, next);
    }
  }

  if (!isAdmin && !loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Pedidos' }} />
        <Text style={styles.empty}>No tenés permisos para ver esta sección.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Pedidos' }} />
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const renderOrder = ({ item }: { item: OrderRow }) => {
    const nextStatuses = NEXT_STATUSES[item.status];
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.customer}>{item.profiles?.full_name || item.profiles?.email || 'Alumno'}</Text>
          <Text style={[styles.status, statusStyle(item.status)]}>{STATUS_LABELS[item.status]}</Text>
        </View>
        <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        {item.order_items.map((line, index) => (
          <Text key={index} style={styles.line}>
            {line.quantity} × {line.products?.name ?? 'Producto'}
          </Text>
        ))}
        <Text style={styles.total}>Total: {formatPrice(item.total_amount)}</Text>

        {nextStatuses.length > 0 && (
          <View style={styles.actions}>
            {updatingId === item.id ? (
              <ActivityIndicator color="#007AFF" />
            ) : (
              nextStatuses.map((next) => (
                <TouchableOpacity
                  key={next}
                  style={[styles.actionButton, next === 'cancelled' && styles.actionDanger]}
                  onPress={() => confirmChange(item, next)}
                >
                  <Text style={[styles.actionText, next === 'cancelled' && styles.actionTextDanger]}>
                    {STATUS_LABELS[next]}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Pedidos (admin)' }} />
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
        ListEmptyComponent={<Text style={styles.empty}>{error ?? 'No hay pedidos todavía.'}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  customer: { fontWeight: 'bold', fontSize: 15, flexShrink: 1 },
  status: { fontWeight: 'bold', fontSize: 13 },
  date: { color: '#666', fontSize: 12, marginBottom: 6 },
  line: { fontSize: 14, marginBottom: 2 },
  total: { marginTop: 6, fontWeight: 'bold', textAlign: 'right' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, minHeight: 36, alignItems: 'center' },
  actionButton: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  actionDanger: { backgroundColor: '#FFE5E3' },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  actionTextDanger: { color: '#FF3B30' },
  empty: { textAlign: 'center', marginTop: 40, color: '#888', fontSize: 16 },
});
