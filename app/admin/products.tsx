import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Switch, Alert } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Product, formatPrice } from '../../lib/types';
import { Colors, useColors } from '../../lib/theme';

export default function AdminProductsScreen() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Admin ve todos los productos (activos e inactivos) gracias a RLS
  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, description, price, image_url, stock, is_active')
      .order('name', { ascending: true });

    if (error) {
      Alert.alert('Error', 'No se pudieron cargar los productos.');
    } else {
      setProducts((data ?? []).map((p) => ({ ...p, price: Number(p.price) })));
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) fetchProducts();
      else setLoading(false);
    }, [isAdmin, fetchProducts])
  );

  // La "baja" es desactivar el producto: los pedidos existentes conservan su historial
  async function toggleActive(product: Product, value: boolean) {
    const { error } = await supabase.from('products').update({ is_active: value }).eq('id', product.id);
    if (error) {
      Alert.alert('Error', 'No se pudo cambiar el estado del producto.');
      return;
    }
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_active: value } : p)));
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Productos' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Productos' }} />
        <Text style={styles.empty}>No tenés permisos para ver esta sección.</Text>
      </View>
    );
  }

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/admin/product', params: { id: item.id } })}
    >
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          {formatPrice(item.price)} · Stock: {item.stock}
        </Text>
        <Text style={[styles.meta, !item.is_active && styles.inactive]}>
          {item.is_active ? 'Activo (visible en el menú)' : 'Inactivo (oculto)'}
        </Text>
      </View>
      <Switch value={item.is_active} onValueChange={(value) => toggleActive(item, value)} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Productos',
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push({ pathname: '/admin/product', params: { id: 'nuevo' } })}>
              <Text style={styles.newButton}>+ Nuevo</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No hay productos cargados.</Text>}
      />
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: c.background },
    list: { padding: 16 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      elevation: 2,
    },
    info: { flex: 1, marginRight: 8 },
    name: { fontWeight: 'bold', fontSize: 15, marginBottom: 2, color: c.text },
    meta: { color: c.textMuted, fontSize: 13 },
    inactive: { color: c.danger },
    newButton: { color: c.primary, fontWeight: '600', fontSize: 15 },
    empty: { textAlign: 'center', marginTop: 40, color: c.textFaint, fontSize: 16 },
  });
