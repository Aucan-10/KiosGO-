import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Colors, useColors } from '../lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  async function signInWithEmail() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        // Si no hay error, vamos al Home
        router.replace('/');
      }
    } catch (e) {
      Alert.alert('Error inesperado', 'Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
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
      />

      <TextInput
        placeholder="Contraseña"
        placeholderTextColor={colors.textFaint}
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={signInWithEmail} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Ingresar</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/forgot-password')}>
        <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/register')}>
        <Text style={styles.linkText}>¿No tienes cuenta? Regístrate</Text>
      </TouchableOpacity>
    </View>
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
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    linkText: { color: c.primary, textAlign: 'center', marginTop: 20, fontSize: 16 },
  });
