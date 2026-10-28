import { useEffect, useState, ReactNode } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Switch, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type FormState = {
  name: string;
  description: string;
  price: string;
  stock: string;
  image_url: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = { name: '', description: '', price: '', stock: '0', image_url: '', is_active: true };

// Pantalla de alta (id = "nuevo") y edición (id = uuid) de productos
export default function ProductFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'nuevo';
  const router = useRouter();
  const { isAdmin } = useAuth();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
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

  function validate(): boolean {
    const next: typeof errors = {};
    const price = Number(form.price.replace(',', '.'));
    const stock = Number(form.stock);

    if (!form.name.trim()) next.name = 'El nombre es obligatorio.';
    if (!form.price.trim() || Number.isNaN(price) || price <= 0) next.price = 'Ingresá un precio mayor a 0.';
    if (!Number.isInteger(stock) || stock < 0) next.stock = 'El stock debe ser un número entero, 0 o mayor.';
    if (form.image_url.trim() && !/^https?:\/\//i.test(form.image_url.trim())) {
      next.image_url = 'La imagen debe ser una URL que empiece con http:// o https://';
    }

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
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: isNew ? 'Nuevo producto' : 'Editar producto' }} />

      <Field label="Nombre *" error={errors.name}>
        <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
      </Field>

      <Field label="Descripción">
        <TextInput
          style={[styles.input, styles.multiline]}
          value={form.description}
          onChangeText={(v) => setForm({ ...form, description: v })}
          multiline
        />
      </Field>

      <Field label="Precio *" error={errors.price}>
        <TextInput
          style={styles.input}
          value={form.price}
          onChangeText={(v) => setForm({ ...form, price: v })}
          keyboardType="decimal-pad"
        />
      </Field>

      <Field label="Stock *" error={errors.stock}>
        <TextInput
          style={styles.input}
          value={form.stock}
          onChangeText={(v) => setForm({ ...form, stock: v })}
          keyboardType="number-pad"
        />
      </Field>

      <Field label="URL de la imagen" error={errors.image_url}>
        <TextInput
          style={styles.input}
          value={form.image_url}
          onChangeText={(v) => setForm({ ...form, image_url: v })}
          autoCapitalize="none"
          keyboardType="url"
        />
      </Field>

      <View style={styles.switchRow}>
        <Text style={styles.label}>Visible en el menú</Text>
        <Switch value={form.is_active} onValueChange={(v) => setForm({ ...form, is_active: v })} />
      </View>

      <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Guardar</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  noPerms: { color: '#888', fontSize: 16, textAlign: 'center' },
  field: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#222' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 10, fontSize: 16 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  error: { color: '#FF3B30', marginTop: 4, fontSize: 13 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  saveButton: { backgroundColor: '#34C759', padding: 15, borderRadius: 10, alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: '#9ADBA8' },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
