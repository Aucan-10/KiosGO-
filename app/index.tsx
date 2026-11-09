import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
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
import { normalizeText } from '../lib/search';
import AddToCartButton from '../components/AddToCartButton';


// Producto del menú con el nombre de su categoría ("Otros" si no tiene)
type MenuProduct = Product & { categoryName: string };

export default function HomeScreen() {
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Filtra por nombre y descripción mientras el alumno escribe, y agrupa por categoría
  const sections = useMemo(() => {
    const term = normalizeText(query.trim());
    const matching = term
      ? products.filter((p) => normalizeText(`${p.name} ${p.description ?? ''}`).includes(term))
      : products;
    const groups = new Map<string, MenuProduct[]>();
    for (const p of matching) {
      const list = groups.get(p.categoryName) ?? [];
      list.push(p);
      groups.set(p.categoryName, list);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => (a === 'Otros' ? 1 : b === 'Otros' ? -1 : a.localeCompare(b, 'es')))
      .map(([title, data]) => ({ title, data }));
  }, [products, query]);
  const { addToCart, getQuantity, itemCount, total } = useCart();
  const { profile } = useAuth();
  const router = useRouter();

  const fetchProducts = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('products')
      .select('id, name, description, price, image_url, stock, is_active, categories(name)')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (fetchError) {
      setError('No pudimos cargar el menú. Revisá tu conexión e intentá de nuevo.');
    } else {
      setProducts(
        (data ?? []).map((p) => {
          // La relación puede venir como objeto o como lista según la consulta
          const cat = p.categories as { name: string } | { name: string }[] | null;
          const categoryName = (Array.isArray(cat) ? cat[0]?.name : cat?.name) || 'Otros';
          return { ...p, price: Number(p.price), categoryName };
        })
      );
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
          <Image source={{ uri: item.image_url }} style={styles.image} accessibilityLabel={`Foto de ${item.name}`} />
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
            <AddToCartButton
              name={item.name}
              disabled={outOfStock || maxReached}
              maxReached={maxReached}
              onAdd={() =>
                addToCart({
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  image_url: item.image_url,
                  stock: item.stock,
                })
              }
            />
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

      <TouchableOpacity
        style={styles.recommendButton}
        onPress={() => router.push('/recomendador')}
        accessibilityRole="button"
        accessibilityLabel="Pedir una recomendación de productos"
      >
        <Text style={styles.recommendText}>✨ ¿No sabés qué pedir? Pedí una recomendación</Text>
      </TouchableOpacity>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader} accessibilityRole="header">
            {section.title}
          </Text>
        )}
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
    recommendButton: {
      marginHorizontal: 16,
      marginTop: 10,
      minHeight: 48,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.primary,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    recommendText: { color: c.primary, fontWeight: '600', fontSize: 14, textAlign: 'center' },
    list: { padding: 16 },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', color: c.text, marginTop: 4, marginBottom: 10 },
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
    addButtonText: { color: c.onPrimary, fontWeight: 'bold', fontSize: 14 },
    empty: { textAlign: 'center', marginTop: 40, color: c.textFaint, fontSize: 16, paddingHorizontal: 20 },
  });
