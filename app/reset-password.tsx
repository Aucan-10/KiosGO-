import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Colors, useColors } from '../lib/theme';

const MIN_LENGTH = 8;

export default function ResetPasswordScreen() {
  // El enlace del email llega como kiosgo://reset-password?code=...
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    let active = true;

    async function prepareSession() {
      if (typeof code === 'string' && code.length > 0) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (active) setStatus(error ? 'invalid' : 'ready');
        return;
      }
      // Sin código: solo sirve si ya hay una sesión de recuperación activa
      const { data } = await supabase.auth.getSession();
      if (active) setStatus(data.session ? 'ready' : 'invalid');
    }

    prepareSession();
    return () => {
      active = false;
    };
  }, [code]);

  async function savePassword() {
    if (password.length < MIN_LENGTH) {
      Alert.alert('Error', `La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      Alert.alert('Error', 'No se pudo actualizar la contraseña. Pedí un enlace nuevo.');
      return;
    }
    Alert.alert('Listo', 'Tu contraseña fue actualizada.', [{ text: 'OK', onPress: () => router.replace('/') }]);
  }

  if (status === 'checking') {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Nueva contraseña' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (status === 'invalid') {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Nueva contraseña' }} />
        <Text style={styles.text}>El enlace no es válido o ya venció.</Text>
        <TouchableOpacity onPress={() => router.replace('/forgot-password')}>
          <Text style={styles.linkText}>Pedir un enlace nuevo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Nueva contraseña' }} />
      <Text style={styles.title}>Creá tu nueva contraseña</Text>

      <TextInput
        placeholder="Nueva contraseña"
        placeholderTextColor={colors.textFaint}
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />
      <TextInput
        placeholder="Repetí la contraseña"
        placeholderTextColor={colors.textFaint}
        value={confirm}
        onChangeText={setConfirm}
        style={styles.input}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={savePassword} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar contraseña</Text>}
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: c.surface },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: c.surface },
    title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: c.text },
    text: { fontSize: 16, textAlign: 'center', color: c.textMuted, marginBottom: 16 },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      padding: 15,
      borderRadius: 10,
      marginBottom: 15,
      fontSize: 16,
      color: c.text,
    },
    button: { backgroundColor: c.primary, padding: 15, borderRadius: 10, alignItems: 'center' },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    linkText: { color: c.primary, textAlign: 'center', marginTop: 10, fontSize: 16 },
  });
