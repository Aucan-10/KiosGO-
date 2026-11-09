import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from '../lib/supabase';
import { isValidEmail, translateAuthError } from '../lib/messages';
import { Colors, useColors } from '../lib/theme';
import FormScreen from '../components/FormScreen';

// En Expo Go, Linking.createURL devuelve kiosgo:// (el esquema del APK), que Expo Go no abre.
// Ahí armamos la URL exp:// con el host del servidor de desarrollo.
function getRedirectUrl() {
  const hostUri = Constants.expoConfig?.hostUri;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient && hostUri) {
    return `exp://${hostUri}/--/reset-password`;
  }
  return Linking.createURL('reset-password');
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  async function sendResetEmail() {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Ingresá tu email.');
      return;
    }
    if (!isValidEmail(trimmed)) {
      Alert.alert('Email no válido', 'Revisá que el email tenga el formato correcto, por ejemplo nombre@mail.com.');
      return;
    }

    setLoading(true);
    try {
      // En el APK: kiosgo://reset-password. En Expo Go: exp://<host>/--/reset-password.
      const redirectTo = getRedirectUrl();
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });

      if (error) {
        Alert.alert('No se pudo enviar el correo', translateAuthError(error.message));
        return;
      }

      // Mismo mensaje exista o no la cuenta, para no revelar qué emails están registrados
      Alert.alert(
        'Revisá tu email',
        'Si el email está registrado, te enviamos un enlace para restablecer la contraseña.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert('Error inesperado', 'Verificá tu conexión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormScreen>
      <Stack.Screen options={{ title: 'Recuperar contraseña' }} />
      <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
      <Text style={styles.subtitle}>Te enviamos un enlace para crear una nueva.</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.textFaint}
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TouchableOpacity style={styles.button} onPress={sendResetEmail} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>Enviar enlace</Text>}
      </TouchableOpacity>
    </FormScreen>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: c.surface },
    title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: c.text },
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
    buttonText: { color: c.onPrimary, fontWeight: 'bold', fontSize: 16 },
  });
