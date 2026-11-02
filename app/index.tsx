import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Product, formatPrice } from '../lib/types';
import { Colors, useColors } from '../lib/theme';

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { addToCart, getQuantity, itemCount, total } = useCart();
  const { profile, isAdmin, signOut } = useAuth();
  const router = useRouter();

  const fetchProducts = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('products')
      .select('id, name, description, price, image_url, stock, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (fetchError) {
      setError('No pudimos cargar el menú. Revisá tu conexión e intentá de nuevo.');
    } else {
      setProducts((data ?? []).map((p) => ({ ...p, price: Number(p.price) })));
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Se recarga cada vez que la pantalla vuelve a tener foco (ej. al volver del carrito)
  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [fetchProducts])
  );

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      Alert.alert('Error', 'No se pudo cerrar sesión. Intentá de nuevo.');
    }
  }

  const renderProduct = ({ item }: { item: Product }) => {
    const inCart = getQuantity(item.id);
    const outOfStock = item.stock <= 0;
    const maxReached = inCart >= item.stock;

    return (
      <View style={styles.card}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>Sin imagen</Text>
          </View>
        )}
        <View style={styles.cardContent}>
          <Text style={styles.title}>{item.name}</Text>
          {!!item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <Text style={[styles.stock, outOfStock && styles.stockEmpty]}>
            {outOfStock ? 'Sin stock' : `Stock: ${item.stock}`}
          </Text>
          <View style={styles.row}>
            <Text style={styles.price}>{formatPrice(item.price)}</Text>
            <TouchableOpacity
              style={[styles.addButton, (outOfStock || maxReached) && styles.addButtonDisabled]}
              disabled={outOfStock || maxReached}
              onPress={() =>
                addToCart({
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  image_url: item.image_url,
                  stock: item.stock,
                })
              }
            >
              <Text style={styles.addButtonText}>
                {maxReached && !outOfStock ? 'Máximo' : '+ Agregar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando menú...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'KiosGo! Menú',
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/cart')} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>Carrito ({itemCount})</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.header}>
        <Text style={styles.greeting}>Hola{profile?.full_name ? `, ${profile.full_name}` : ''}</Text>
        {itemCount > 0 && (
          <View style={styles.cartSummary}>
            <Text style={styles.cartText}>
              {itemCount} {itemCount === 1 ? 'ítem' : 'ítems'} | Total: {formatPrice(total)}
            </Text>
          </View>
        )}
        <View style={styles.navRow}>
          <NavButton label="Mis pedidos" onPress={() => router.push('/orders')} styles={styles} />
          <NavButton label="Mi cuenta" onPress={() => router.push('/account')} styles={styles} />
          {isAdmin && <NavButton label="Pedidos (admin)" onPress={() => router.push('/admin/orders')} styles={styles} />}
          {isAdmin && <NavButton label="Productos (admin)" onPress={() => router.push('/admin/products')} styles={styles} />}
          <NavButton label="Cerrar sesión" onPress={handleSignOut} danger styles={styles} />
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchProducts();
            }}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>{error ?? 'No hay productos disponibles por ahora.'}</Text>
        }
      />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function NavButton({
  label,
  onPress,
  danger,
  styles,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  styles: Styles;
}) {
  return (
    <TouchableOpacity style={[styles.navButton, danger && styles.navButtonDanger]} onPress={onPress}>
      <Text style={[styles.navButtonText, danger && styles.navButtonTextDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
    loadingText: { marginTop: 10, color: c.textMuted },
    headerButton: { paddingHorizontal: 8, paddingVertical: 4 },
    headerButtonText: { color: c.primary, fontWeight: '600' },
    header: { padding: 16, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
    greeting: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: c.text },
    cartSummary: { backgroundColor: c.successSoft, padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
    cartText: { color: c.successText, fontWeight: 'bold', fontSize: 15 },
    navRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    navButton: { backgroundColor: c.primarySoft, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    navButtonDanger: { backgroundColor: c.dangerSoft },
    navButtonText: { color: c.primary, fontWeight: '600', fontSize: 13 },
    navButtonTextDanger: { color: c.danger },
    list: { padding: 16 },
    card: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: 12,
      marginBottom: 16,
      overflow: 'hidden',
      elevation: 3,
    },
    image: { width: 100, height: 110 },
    imagePlaceholder: { backgroundColor: c.placeholderBg, justifyContent: 'center', alignItems: 'center' },
    imagePlaceholderText: { color: c.textFaint, fontSize: 12 },
    cardContent: { flex: 1, padding: 12, justifyContent: 'space-between' },
    title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, color: c.text },
    description: { fontSize: 12, color: c.textMuted, marginBottom: 6 },
    stock: { fontSize: 12, color: c.textMuted, marginBottom: 6 },
    stockEmpty: { color: c.danger, fontWeight: '600' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    price: { fontSize: 18, fontWeight: 'bold', color: c.success },
    addButton: { backgroundColor: c.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    addButtonDisabled: { backgroundColor: c.primaryDisabled },
    addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    empty: { textAlign: 'center', marginTop: 40, color: c.textFaint, fontSize: 16, paddingHorizontal: 20 },
  });
