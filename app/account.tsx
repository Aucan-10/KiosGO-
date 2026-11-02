import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Colors, useColors } from '../lib/theme';

const MIN_PASSWORD = 8;
const MAX_NAME = 60;

export default function AccountScreen() {
  const { session, profile, refreshProfile, signOut } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setName(profile?.full_name ?? '');
  }, [profile?.full_name]);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Error', 'El nombre no puede estar vacío.');
      return;
    }
    if (trimmed.length > MAX_NAME) {
      Alert.alert('Error', `El nombre no puede superar los ${MAX_NAME} caracteres.`);
      return;
    }
    if (!session) return;

    setSavingName(true);
    // RLS: solo se puede modificar el propio perfil, y la base solo permite cambiar full_name
    const { error } = await supabase.from('profiles').update({ full_name: trimmed }).eq('id', session.user.id);
    setSavingName(false);

    if (error) {
      Alert.alert('Error', 'No se pudo guardar el nombre. Intentá de nuevo.');
      return;
    }
    await refreshProfile();
    Alert.alert('Listo', 'Tu nombre fue actualizado.');
  }

  async function savePassword() {
    if (newPassword.length < MIN_PASSWORD) {
      Alert.alert('Error', `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      Alert.alert('Error', 'No se pudo cambiar la contraseña. Intentá de nuevo.');
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    Alert.alert('Listo', 'Tu contraseña fue actualizada.');
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      Alert.alert('Error', 'No se pudo cerrar sesión. Intentá de nuevo.');
    }
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Mi cuenta' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Mi cuenta' }} />

      <Text style={styles.sectionTitle}>Datos personales</Text>
      <Text style={styles.label}>Email</Text>
      <Text style={styles.readonly}>{profile?.email ?? session.user.email}</Text>

      <Text style={styles.label}>Nombre</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholder="Tu nombre"
        placeholderTextColor={colors.textFaint}
        maxLength={MAX_NAME}
      />
      <TouchableOpacity style={styles.button} onPress={saveName} disabled={savingName}>
        {savingName ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar nombre</Text>}
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Cambiar contraseña</Text>
      <TextInput
        placeholder="Nueva contraseña"
        placeholderTextColor={colors.textFaint}
        value={newPassword}
        onChangeText={setNewPassword}
        style={styles.input}
        secureTextEntry
      />
      <TextInput
        placeholder="Repetí la nueva contraseña"
        placeholderTextColor={colors.textFaint}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={styles.input}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={savePassword} disabled={savingPassword}>
        {savingPassword ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Cambiar contraseña</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleSignOut}>
        <Text style={[styles.buttonText, styles.logoutText]}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surface },
    content: { padding: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.surface },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: c.text },
    sectionSpacing: { marginTop: 28 },
    label: { fontSize: 13, color: c.textMuted, marginBottom: 4 },
    readonly: { fontSize: 16, color: c.text, marginBottom: 16 },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      padding: 15,
      borderRadius: 10,
      marginBottom: 12,
      fontSize: 16,
      color: c.text,
    },
    button: { backgroundColor: c.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 8 },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    logoutButton: { backgroundColor: c.dangerSoft, marginTop: 32 },
    logoutText: { color: c.danger },
  });
