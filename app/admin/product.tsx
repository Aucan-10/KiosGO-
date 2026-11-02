import { useEffect, useMemo, useState, ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  ScrollView,
  Image,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Colors, useColors } from '../../lib/theme';

type FormState = {
  name: string;
  description: string;
  price: string;
  stock: string;
  image_url: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = { name: '', description: '', price: '', stock: '0', image_url: '', is_active: true };
const IMAGES_BUCKET = 'productos';

// Convierte la imagen en base64 (como la devuelve el selector) a bytes para subirla
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Pantalla de alta (id = "nuevo") y edición (id = uuid) de productos
export default function ProductFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'nuevo';
  const router = useRouter();
  const { isAdmin } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (isNew) return;
    supabase
      .from('products')
      .select('name, description, price, stock, image_url, is_active')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          Alert.alert('Error', 'No se encontró el producto.');
          router.back();
          return;
        }
        setForm({
          name: data.name ?? '',
          description: data.description ?? '',
          price: String(data.price ?? ''),
          stock: String(data.stock ?? 0),
          image_url: data.image_url ?? '',
          is_active: data.is_active ?? true,
        });
        setLoading(false);
      });
  }, [id, isNew, router]);

  // Abre la galería del celular, sube la foto al bucket y guarda su URL pública en el formulario
  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    setUploading(true);
    try {
      if (!asset.base64) throw new Error('No se pudo leer la imagen seleccionada.');
      const bytes = base64ToArrayBuffer(asset.base64);
      // DEBUG: tamaño real del archivo a subir (quitar después)
      console.log('[DEBUG] bytes a subir:', bytes.byteLength);
      const { error: uploadError } = await supabase.storage
        .from(IMAGES_BUCKET)
        .upload(path, bytes, { contentType: mimeType });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(path);
      setForm((prev) => ({ ...prev, image_url: data.publicUrl }));
    } catch (e) {
      // DEBUG: mostrar el error real mientras diagnosticamos la subida (quitar después)
      console.log('[DEBUG] error al subir imagen:', e);
      const message = (e as { message?: string })?.message ?? JSON.stringify(e);
      Alert.alert('Error al subir la imagen', message);
    } finally {
      setUploading(false);
    }
  }

  function validate(): boolean {
    const next: typeof errors = {};
    const price = Number(form.price.replace(',', '.'));
    const stock = Number(form.stock);

    if (!form.name.trim()) next.name = 'El nombre es obligatorio.';
    if (!form.price.trim() || Number.isNaN(price) || price <= 0) next.price = 'Ingresá un precio mayor a 0.';
    if (!Number.isInteger(stock) || stock < 0) next.stock = 'El stock debe ser un número entero, 0 o mayor.';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price.replace(',', '.')),
      stock: Number(form.stock),
      image_url: form.image_url.trim() || null,
      is_active: form.is_active,
    };

    try {
      const { error } = isNew
        ? await supabase.from('products').insert(payload)
        : await supabase.from('products').update(payload).eq('id', id);

      if (error) {
        Alert.alert('No se pudo guardar', error.message);
        return;
      }
      router.back();
    } catch {
      Alert.alert('Error de conexión', 'Revisá tu conexión e intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteProduct() {
    Alert.alert(
      'Eliminar producto',
      '¿Seguro que querés eliminar este producto? Si tiene pedidos no se puede eliminar: en ese caso, desactivalo.',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, eliminar', style: 'destructive', onPress: deleteProduct },
      ]
    );
  }

  async function deleteProduct() {
    setSaving(true);
    const { error } = await supabase.from('products').delete().eq('id', id);
    setSaving(false);

    if (error) {
      // 23503: el producto está en pedidos (ON DELETE RESTRICT)
      const hasOrders = error.code === '23503';
      Alert.alert(
        'No se pudo eliminar',
        hasOrders ? 'El producto tiene pedidos asociados. Desactivalo en lugar de eliminarlo.' : error.message
      );
      return;
    }
    router.back();
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Producto' }} />
        <Text style={styles.noPerms}>No tenés permisos para editar productos.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Producto' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: isNew ? 'Nuevo producto' : 'Editar producto' }} />

      <Field label="Nombre *" error={errors.name} styles={styles}>
        <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
      </Field>

      <Field label="Descripción" styles={styles}>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={form.description}
          onChangeText={(v) => setForm({ ...form, description: v })}
          multiline
        />
      </Field>

      <Field label="Precio *" error={errors.price} styles={styles}>
        <TextInput
          style={styles.input}
          value={form.price}
          onChangeText={(v) => setForm({ ...form, price: v })}
          keyboardType="decimal-pad"
        />
      </Field>

      <Field label="Stock *" error={errors.stock} styles={styles}>
        <TextInput
          style={styles.input}
          value={form.stock}
          onChangeText={(v) => setForm({ ...form, stock: v })}
          keyboardType="number-pad"
        />
      </Field>

      <Field label="Imagen" styles={styles}>
        {form.image_url ? (
          <Image source={{ uri: form.image_url }} style={styles.preview} />
        ) : (
          <View style={[styles.preview, styles.previewEmpty]}>
            <Text style={styles.previewText}>Sin imagen</Text>
          </View>
        )}
        <TouchableOpacity style={styles.secondaryButton} onPress={pickImage} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.secondaryButtonText}>Seleccionar del celular</Text>
          )}
        </TouchableOpacity>
        {!!form.image_url && (
          <TouchableOpacity onPress={() => setForm({ ...form, image_url: '' })}>
            <Text style={styles.removeImage}>Quitar imagen</Text>
          </TouchableOpacity>
        )}
      </Field>

      <View style={styles.switchRow}>
        <Text style={styles.label}>Visible en el menú</Text>
        <Switch value={form.is_active} onValueChange={(v) => setForm({ ...form, is_active: v })} />
      </View>

      <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Guardar</Text>}
      </TouchableOpacity>

      {!isNew && (
        <TouchableOpacity style={styles.deleteButton} onPress={confirmDeleteProduct} disabled={saving}>
          <Text style={styles.deleteText}>Eliminar producto</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function Field({
  label,
  error,
  children,
  styles,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  styles: Styles;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surface },
    content: { padding: 20, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: c.surface },
    noPerms: { color: c.textFaint, fontSize: 16, textAlign: 'center' },
    field: { marginBottom: 14 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: c.text },
    input: { borderWidth: 1, borderColor: c.inputBorder, padding: 12, borderRadius: 10, fontSize: 16, color: c.text },
    multiline: { minHeight: 80, textAlignVertical: 'top' },
    error: { color: c.danger, marginTop: 4, fontSize: 13 },
    preview: { width: 160, height: 160, borderRadius: 12, marginBottom: 10 },
    previewEmpty: { backgroundColor: c.placeholderBg, justifyContent: 'center', alignItems: 'center' },
    previewText: { color: c.textFaint, fontSize: 13 },
    secondaryButton: {
      backgroundColor: c.primarySoft,
      padding: 12,
      borderRadius: 10,
      alignItems: 'center',
      marginBottom: 8,
    },
    secondaryButtonText: { color: c.primary, fontWeight: '600', fontSize: 15 },
    removeImage: { color: c.danger, fontSize: 14, marginTop: 4 },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    saveButton: { backgroundColor: c.success, padding: 15, borderRadius: 10, alignItems: 'center' },
    saveButtonDisabled: { backgroundColor: c.greenDisabled },
    saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    deleteButton: { marginTop: 12, padding: 15, borderRadius: 10, alignItems: 'center', backgroundColor: c.dangerSoft },
    deleteText: { color: c.danger, fontWeight: 'bold', fontSize: 16 },
  });
