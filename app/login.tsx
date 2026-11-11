import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Colors, useColors } from '../lib/theme';
import FormScreen from '../components/FormScreen';
import { isValidEmail, translateAuthError } from '../lib/messages';
import { getRedirectUrl } from '../lib/redirect';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Abre el login de Google en el navegador de la app y canjea el código que vuelve por una sesión (PKCE)
  async function signInWithGoogle() {
    setLoading(true);
    try {
      const redirectTo = getRedirectUrl('auth-callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data.url) {
        Alert.alert('No se pudo ingresar con Google', error ? translateAuthError(error.message) : 'Intentá de nuevo.');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      // Si el alumno cerró la ventana o canceló, no mostramos error
      if (result.type !== 'success') return;

      const callbackUrl = new URL(result.url);
      const oauthError = callbackUrl.searchParams.get('error_description') ?? callbackUrl.searchParams.get('error');
      const code = callbackUrl.searchParams.get('code');
      if (oauthError || !code) {
        Alert.alert('No se pudo ingresar con Google', oauthError ?? 'Intentá de nuevo.');
        return;
      }

      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
      if (sessionError) {
        Alert.alert('No se pudo ingresar con Google', translateAuthError(sessionError.message));
        return;
      }
      router.replace('/');
    } catch (e) {
      Alert.alert('Error de conexión', 'Revisá tu internet e intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function signInWithEmail() {
    if (!email.trim() || !password) {
      Alert.alert('Faltan datos', 'Ingresá tu email y tu contraseña.');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Email no válido', 'Revisá que el email tenga el formato correcto, por ejemplo nombre@mail.com.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        Alert.alert('No se pudo ingresar', translateAuthError(error.message));
      } else {
        // Si no hay error, vamos al Home
        router.replace('/');
      }
    } catch (e) {
      Alert.alert('Error de conexión', 'Revisá tu internet e intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormScreen>
      <Text style={styles.title}>KiosGo!</Text>
      <Text style={styles.subtitle}>Inicia sesión para pedir</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.textFaint}
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        accessibilityLabel="Email"
      />

      <TextInput
        placeholder="Contraseña"
        placeholderTextColor={colors.textFaint}
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry={!showPassword}
        autoComplete="password"
        accessibilityLabel="Contraseña"
      />
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setShowPassword((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: showPassword }}
        accessibilityLabel="Mostrar contraseña"
      >
        <Text style={styles.toggleText}>{showPassword ? '☑' : '☐'} Mostrar contraseña</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={signInWithEmail}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Ingresar"
      >
        {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>Ingresar</Text>}
      </TouchableOpacity>

      <Text style={styles.orText}>o</Text>

      <TouchableOpacity
        style={styles.googleButton}
        onPress={signInWithGoogle}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Ingresar con Google"
      >
        <Text style={styles.googleText}>Continuar con Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/forgot-password')}>
        <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/register')}>
        <Text style={styles.linkText}>¿No tenés cuenta? Registrate</Text>
      </TouchableOpacity>
    </FormScreen>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: c.surface },
    title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: c.text },
    subtitle: { fontSize: 16, textAlign: 'center', color: c.textMuted, marginBottom: 30 },
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
    orText: { textAlign: 'center', color: c.textFaint, marginVertical: 12, fontSize: 14 },
    googleButton: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.surface,
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
    },
    googleText: { color: c.text, fontWeight: '600', fontSize: 16 },
    buttonText: { color: c.onPrimary, fontWeight: 'bold', fontSize: 16 },
    linkText: { color: c.primary, textAlign: 'center', marginTop: 20, fontSize: 16 },
    toggle: { minHeight: 48, justifyContent: 'center', marginBottom: 10 },
    toggleText: { color: c.text, fontSize: 15 },
  });
