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
import AddToCartButton from '../components/AddToCartButton';

const MAX_PEDIDO = 200;

type Recomendacion = { id: string; motivo: string };
type Accion = { tipo: 'agregar' | 'quitar'; id: string; cantidad: number };
type Sugerencia = { product: Product; motivo: string };
type RespuestaAsistente = { mensaje?: string; recomendaciones?: Recomendacion[]; acciones?: Accion[] };

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

export default function AsistenteScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { addToCart, changeQuantity, getQuantity, items } = useCart();

  const [menu, setMenu] = useState<Product[]>([]);
  const [pedido, setPedido] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [sugerencias, setSugerencias] = useState<Sugerencia[] | null>(null);
  const [acciones, setAcciones] = useState<Accion[] | null>(null);
  const [aplicado, setAplicado] = useState<string | null>(null);

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

  function nombreDe(id: string): string {
    return menu.find((p) => p.id === id)?.name ?? items.find((i) => i.id === id)?.name ?? 'producto';
  }

  async function pedirRecomendacion() {
    const texto = pedido.trim();
    if (!texto) {
      setError('Escribí qué te gustaría comer o qué querés cambiar en tu carrito.');
      return;
    }

    setLoading(true);
    setError(null);
    setMensaje(null);
    setSugerencias(null);
    setAcciones(null);
    setAplicado(null);

    // El asistente ve el carrito actual para poder proponer cambios sobre él
    const carrito = items.map((i) => ({ id: i.id, nombre: i.name, cantidad: i.quantity }));
    const { data, error: invokeError } = await supabase.functions.invoke<RespuestaAsistente>('recomendar', {
      body: { pedido: texto, carrito },
    });

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
    const acc = data?.acciones ?? [];

    if (!data?.mensaje && lista.length === 0 && acc.length === 0) {
      setError('No encontramos algo que combine con eso. Probá con otra descripción.');
      return;
    }
    // Los "agregar" se aplican solos; los "quitar" quedan esperando confirmación
    const agregar = acc.filter((a) => a.tipo === 'agregar');
    const quitar = acc.filter((a) => a.tipo === 'quitar');
    aplicarAgregados(agregar);

    setMensaje(data?.mensaje || null);
    setSugerencias(lista.length > 0 ? lista : null);
    setAcciones(quitar.length > 0 ? quitar : null);
    if (agregar.length > 0) {
      setAplicado(`Agregué al carrito: ${agregar.map((a) => `${a.cantidad} × ${nombreDe(a.id)}`).join(', ')}.`);
    }
  }

  // Suma al carrito los productos que el alumno pidió; no pide confirmación
  function aplicarAgregados(lista: Accion[]) {
    for (const a of lista) {
      const product = menu.find((p) => p.id === a.id);
      if (!product) continue;
      for (let i = 0; i < a.cantidad; i++) {
        addToCart({
          id: product.id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
          stock: product.stock,
        });
      }
    }
  }

  // Quitar sí espera confirmación: el alumno toca "Aplicar cambios"
  function aplicarCambios() {
    if (!acciones) return;
    for (const a of acciones) {
      changeQuantity(a.id, -a.cantidad);
    }
    setAcciones(null);
    setAplicado('Listo, tu carrito ya está actualizado.');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Asistente' }} />

      <Text style={styles.intro}>
        Contanos qué tenés ganas de comer (algo salado, dulce, liviano, barato...) o qué querés cambiar en tu carrito
        (ej: "sacá las papas", "agregá algo dulce").
      </Text>

      <Text style={styles.label} accessibilityRole="text">¿Qué necesitás?</Text>
      <TextInput
        value={pedido}
        onChangeText={setPedido}
        style={styles.input}
        placeholder="Ej: algo salado y barato para el recreo"
        placeholderTextColor={colors.textFaint}
        multiline
        maxLength={MAX_PEDIDO}
        accessibilityLabel="¿Qué necesitás?"
        accessibilityHint="Escribí en pocas palabras lo que querés comer o cambiar en el carrito"
      />
      <Text style={styles.counter}>
        {pedido.length}/{MAX_PEDIDO}
      </Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={pedirRecomendacion}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Consultar al asistente"
      >
        {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>Consultar</Text>}
      </TouchableOpacity>

      {!!error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}

      {!!mensaje && (
        <Text style={styles.mensaje} accessibilityLiveRegion="polite">
          {mensaje}
        </Text>
      )}

      {!!acciones && (
        <View style={styles.accionesBox}>
          <Text style={styles.accionesTitle}>El asistente propone quitar del carrito:</Text>
          {acciones.map((a, index) => (
            <Text key={`${a.tipo}-${a.id}-${index}`} style={styles.accionText}>
              {a.tipo === 'agregar' ? '+ Agregar' : '− Quitar'} {a.cantidad} × {nombreDe(a.id)}
            </Text>
          ))}
          <TouchableOpacity
            style={styles.applyButton}
            onPress={aplicarCambios}
            accessibilityRole="button"
            accessibilityLabel="Aplicar cambios al carrito"
          >
            <Text style={styles.buttonText}>Aplicar cambios</Text>
          </TouchableOpacity>
        </View>
      )}

      {!!aplicado && (
        <Text style={styles.aplicado} accessibilityLiveRegion="polite">
          {aplicado}
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
                <AddToCartButton
                  name={product.name}
                  disabled={outOfStock || maxReached}
                  maxReached={maxReached}
                  onAdd={() =>
                    addToCart({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image_url: product.image_url,
                      stock: product.stock,
                    })
                  }
                />
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
    mensaje: { color: c.text, fontSize: 15, lineHeight: 22, marginBottom: 14 },
    accionesBox: {
      backgroundColor: c.primarySoft,
      borderRadius: 10,
      padding: 14,
      marginBottom: 16,
    },
    accionesTitle: { color: c.text, fontWeight: '600', fontSize: 14, marginBottom: 8 },
    accionText: { color: c.text, fontSize: 15, marginBottom: 4 },
    applyButton: {
      backgroundColor: c.primary,
      minHeight: 48,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
    },
    aplicado: {
      backgroundColor: c.successSoft,
      color: c.successText,
      fontWeight: '600',
      padding: 10,
      borderRadius: 8,
      marginBottom: 16,
      textAlign: 'center',
    },
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
    disclaimer: { fontSize: 12, color: c.textFaint, marginTop: 20, textAlign: 'center', lineHeight: 18 },
  });
