import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { Product, formatPrice } from '../lib/types';
import { Colors, useColors } from '../lib/theme';

const MAX_PEDIDO = 200;

type Recomendacion = { id: string; motivo: string };
type Sugerencia = { product: Product; motivo: string };

// Si la función devolvió un mensaje claro (ej. sesión vencida), se muestra; si no, uno genérico
async function errorMessage(error: unknown): Promise<string> {
  const context = (error as { context?: Response })?.context;
  try {
    const body = await context?.json();
    if (body?.error) return String(body.error);
  } catch {
    // Sin cuerpo de respuesta: usamos el mensaje genérico
  }
  return 'No pudimos obtener recomendaciones. Revisá tu conexión e intentá de nuevo.';
}

export default function RecomendadorScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { addToCart, getQuantity } = useCart();

  const [menu, setMenu] = useState<Product[]>([]);
  const [pedido, setPedido] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sugerencias, setSugerencias] = useState<Sugerencia[] | null>(null);

  // Menú para mostrar precio, foto y stock de cada sugerencia
  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, description, price, image_url, stock, is_active')
      .eq('is_active', true)
      .then(({ data }) => {
        setMenu((data ?? []).map((p) => ({ ...p, price: Number(p.price) })));
      });
  }, []);

  async function pedirRecomendacion() {
    const texto = pedido.trim();
    if (!texto) {
      setError('Escribí qué te gustaría comer.');
      return;
    }

    setLoading(true);
    setError(null);
    setSugerencias(null);

    const { data, error: invokeError } = await supabase.functions.invoke<{
      recomendaciones: Recomendacion[];
    }>('recomendar', { body: { pedido: texto } });

    setLoading(false);

    if (invokeError) {
      setError(await errorMessage(invokeError));
      return;
    }

    // Solo se muestran productos que existen en el menú cargado
    const lista = (data?.recomendaciones ?? [])
      .map((r) => {
        const product = menu.find((p) => p.id === r.id);
        return product ? { product, motivo: r.motivo } : null;
      })
      .filter((s): s is Sugerencia => s !== null);

    if (lista.length === 0) {
      setError('No encontramos algo que combine con eso. Probá con otra descripción.');
      return;
    }
    setSugerencias(lista);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Recomendador' }} />

      <Text style={styles.intro}>
        Contanos qué tenés ganas de comer (algo salado, dulce, liviano, barato...) y te sugerimos productos del menú.
      </Text>

      <Text style={styles.label} accessibilityRole="text">¿Qué te gustaría comer?</Text>
      <TextInput
        value={pedido}
        onChangeText={setPedido}
        style={styles.input}
        placeholder="Ej: algo salado y barato para el recreo"
        placeholderTextColor={colors.textFaint}
        multiline
        maxLength={MAX_PEDIDO}
        accessibilityLabel="¿Qué te gustaría comer?"
        accessibilityHint="Escribí en pocas palabras lo que querés comer"
      />
      <Text style={styles.counter}>
        {pedido.length}/{MAX_PEDIDO}
      </Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={pedirRecomendacion}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Pedir recomendación"
      >
        {loading ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.buttonText}>Recomendame</Text>
        )}
      </TouchableOpacity>

      {!!error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}

      {sugerencias?.map(({ product, motivo }) => {
        const inCart = getQuantity(product.id);
        const outOfStock = product.stock <= 0;
        const maxReached = inCart >= product.stock;
        return (
          <View key={product.id} style={styles.card}>
            {product.image_url ? (
              <Image
                source={{ uri: product.image_url }}
                style={styles.image}
                accessibilityLabel={`Foto de ${product.name}`}
              />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]} accessible={false}>
                <Text style={styles.imagePlaceholderText}>Sin imagen</Text>
              </View>
            )}
            <View style={styles.cardContent}>
              <Text style={styles.title}>{product.name}</Text>
              <Text style={styles.motivo}>{motivo}</Text>
              <View style={styles.row}>
                <Text style={styles.price}>{formatPrice(product.price)}</Text>
                <TouchableOpacity
                  style={[styles.addButton, (outOfStock || maxReached) && styles.addButtonDisabled]}
                  disabled={outOfStock || maxReached}
                  onPress={() =>
                    addToCart({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image_url: product.image_url,
                      stock: product.stock,
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Agregar ${product.name} al carrito`}
                >
                  <Text style={styles.addButtonText}>{maxReached && !outOfStock ? 'Máximo' : '+ Agregar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })}

      <Text style={styles.disclaimer}>
        Sugerencias generadas por inteligencia artificial. Revisá precio y stock antes de confirmar tu pedido.
      </Text>
    </ScrollView>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 20, paddingBottom: 40 },
    intro: { fontSize: 15, color: c.textMuted, marginBottom: 20, lineHeight: 22 },
    label: { fontSize: 14, fontWeight: '600', color: c.text, marginBottom: 6 },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 80,
      fontSize: 16,
      color: c.text,
      textAlignVertical: 'top',
    },
    counter: { alignSelf: 'flex-end', fontSize: 12, color: c.textFaint, marginTop: 4, marginBottom: 12 },
    button: {
      backgroundColor: c.primary,
      minHeight: 48,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    buttonDisabled: { backgroundColor: c.primaryDisabled },
    buttonText: { color: c.onPrimary, fontWeight: 'bold', fontSize: 16 },
    error: { color: c.danger, fontSize: 14, marginBottom: 16 },
    card: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: 12,
      marginBottom: 14,
      overflow: 'hidden',
      elevation: 3,
    },
    image: { width: 96, minHeight: 110 },
    imagePlaceholder: { backgroundColor: c.placeholderBg, justifyContent: 'center', alignItems: 'center' },
    imagePlaceholderText: { color: c.textFaint, fontSize: 12 },
    cardContent: { flex: 1, padding: 12, justifyContent: 'space-between' },
    title: { fontSize: 16, fontWeight: 'bold', color: c.text, marginBottom: 4 },
    motivo: { fontSize: 13, color: c.textMuted, marginBottom: 8 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    price: { fontSize: 17, fontWeight: 'bold', color: c.success },
    addButton: {
      backgroundColor: c.primary,
      minHeight: 40,
      paddingHorizontal: 12,
      borderRadius: 8,
      justifyContent: 'center',
    },
    addButtonDisabled: { backgroundColor: c.primaryDisabled },
    addButtonText: { color: c.onPrimary, fontWeight: 'bold', fontSize: 14 },
    disclaimer: { fontSize: 12, color: c.textFaint, marginTop: 20, textAlign: 'center', lineHeight: 18 },
  });
