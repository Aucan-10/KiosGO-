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
  TextInput,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Product, formatPrice } from '../lib/types';
import { Colors, useColors } from '../lib/theme';

// Pasa a minúsculas y quita tildes, para que "jamon" encuentre "Jamón"
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Filtra por nombre y descripción mientras el alumno escribe
  const filteredProducts = useMemo(() => {
    const term = normalizeText(query.trim());
    if (!term) return products;
    return products.filter((p) => normalizeText(`${p.name} ${p.description ?? ''}`).includes(term));
  }, [products, query]);
  const { addToCart, getQuantity, itemCount, total } = useCart();
  const { profile } = useAuth();
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
      </View>

      <View style={styles.searchRow}>
        <TextInput
          placeholder="Buscar productos..."
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          autoCorrect={false}
          returnKeyType="search"
        />
        {!!query && (
          <TouchableOpacity style={styles.clearButton} onPress={() => setQuery('')}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredProducts}
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
          <Text style={styles.empty}>
            {error ??
              (query.trim()
                ? `No encontramos productos para "${query.trim()}".`
                : 'No hay productos disponibles por ahora.')}
          </Text>
        }
      />
    </View>
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
    searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
    searchInput: {
      flex: 1,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 16,
      color: c.text,
    },
    clearButton: { marginLeft: 8, paddingHorizontal: 10, paddingVertical: 8 },
    clearText: { color: c.textMuted, fontSize: 16, fontWeight: '600' },
    list: { padding: 16 },
    card: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: 12,
      marginBottom: 16,
      overflow: 'hidden',
      elevation: 3,
    },
    // Sin altura fija: la foto se estira con la altura de la tarjeta
    image: { width: 100, minHeight: 110 },
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
