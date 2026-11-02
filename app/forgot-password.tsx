import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from '../lib/supabase';
import { Colors, useColors } from '../lib/theme';

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

    setLoading(true);
    try {
      // En el APK: kiosgo://reset-password. En Expo Go: exp://<host>/--/reset-password.
      const redirectTo = getRedirectUrl();
      // DEBUG: revisar en la terminal de Expo qué redirect se envía (quitar después)
      console.log('[DEBUG] redirectTo para recuperación:', redirectTo);
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });

      if (error) {
        // DEBUG: se muestra el mensaje real de Supabase (dejar mientras diagnosticamos)
        Alert.alert('Error', `No pudimos enviar el correo: ${error.message}`);
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
    <View style={styles.container}>
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
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar enlace</Text>}
      </TouchableOpacity>
    </View>
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
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  });
