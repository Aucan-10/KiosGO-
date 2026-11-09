import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Colors, useColors } from '../lib/theme';
import FormScreen from '../components/FormScreen';
import { isValidEmail, translateAuthError, MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH } from '../lib/messages';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  function validate(): string | null {
    if (!name.trim()) return 'Ingresá tu nombre.';
    if (name.trim().length > MAX_NAME_LENGTH) return `El nombre no puede superar los ${MAX_NAME_LENGTH} caracteres.`;
    if (!email.trim()) return 'Ingresá tu email.';
    if (!isValidEmail(email)) return 'El email no es válido. Por ejemplo: nombre@mail.com.';
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    return null;
  }

  async function signUpWithEmail() {
    const problem = validate();
    if (problem) {
      Alert.alert('Revisá los datos', problem);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        // El rol NO se envía desde el cliente: el trigger de la base siempre asigna 'student'
        data: {
          full_name: name.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      Alert.alert('No se pudo crear la cuenta', translateAuthError(error.message));
    } else {
      // Si desactivaste "Confirm Email" en Supabase, nos logueamos automáticamente
      // Si sigue activado, el usuario no podrá entrar hasta verificar su mail.
      if (data.session) {
        router.replace('/');
      } else {
        // Con "Confirm email" activado, Supabase envía un correo con el enlace de verificación
        Alert.alert(
          'Revisá tu email',
          `Te enviamos un correo a ${email.trim()}. Abrilo y tocá el enlace para verificar tu cuenta. Después iniciá sesión.`
        );
        router.replace('/login');
      }
    }
  }

  return (
    <FormScreen>
      <Text style={styles.title}>Crear cuenta</Text>
      <Text style={styles.subtitle}>Unite a KiosGo!</Text>

      <TextInput
        placeholder="Nombre completo"
        placeholderTextColor={colors.textFaint}
        value={name}
        onChangeText={setName}
        style={styles.input}
        maxLength={MAX_NAME_LENGTH}
      />

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
        placeholder={`Contraseña (mínimo ${MIN_PASSWORD_LENGTH} caracteres)`}
        placeholderTextColor={colors.textFaint}
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={signUpWithEmail} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>Registrarse</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.linkText}>Volver al login</Text>
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
    button: {
      backgroundColor: c.success,
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 10,
    },
    buttonText: { color: c.onPrimary, fontWeight: 'bold', fontSize: 16 },
    linkText: { color: c.primary, textAlign: 'center', marginTop: 20, fontSize: 16 },
  });
