import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Colors, THEME_PREFERENCES, useColors, useThemeSettings } from '../lib/theme';
import { translateAuthError } from '../lib/messages';
import { base64ToArrayBuffer } from '../lib/images';
import { CURSOS } from '../lib/cursos';
import Avatar, { AVATAR_BUCKET } from '../components/Avatar';

const MIN_PASSWORD = 8;
const MAX_NAME = 60;

export default function AccountScreen() {
  const { session, profile, refreshProfile, signOut } = useAuth();
  const { preference, setPreference } = useThemeSettings();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [name, setName] = useState('');
  const [curso, setCurso] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setName(profile?.full_name ?? '');
    setCurso(profile?.curso ?? '');
  }, [profile?.full_name, profile?.curso]);

  // Elige una foto de la galería, la sube al bucket privado y la guarda en el perfil
  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0] || !session) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert('Error', 'No se pudo leer la imagen seleccionada.');
      return;
    }
    const mimeType = asset.mimeType ?? 'image/jpeg';
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    // Cada usuario sube solo dentro de su carpeta (su id), según las políticas de la base
    const path = `${session.user.id}/${Date.now()}.${ext}`;
    const oldPath = profile?.avatar_path ?? null;

    setSavingAvatar(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, base64ToArrayBuffer(asset.base64), { contentType: mimeType });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_path: path })
        .eq('id', session.user.id);
      if (updateError) throw updateError;

      // La foto anterior ya no se usa: se borra para no acumular archivos
      if (oldPath) await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);
      await refreshProfile();
    } catch (e) {
      Alert.alert('No se pudo cambiar la foto', (e as { message?: string })?.message ?? 'Intentá de nuevo.');
    } finally {
      setSavingAvatar(false);
    }
  }

  function confirmRemoveAvatar() {
    Alert.alert('Quitar foto', '¿Querés quitar tu foto de perfil?', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, quitar', style: 'destructive', onPress: removeAvatar },
    ]);
  }

  async function removeAvatar() {
    if (!session || !profile?.avatar_path) return;
    const oldPath = profile.avatar_path;

    setSavingAvatar(true);
    const { error } = await supabase.from('profiles').update({ avatar_path: null }).eq('id', session.user.id);
    if (!error) await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);
    setSavingAvatar(false);

    if (error) {
      Alert.alert('Error', 'No se pudo quitar la foto. Intentá de nuevo.');
      return;
    }
    await refreshProfile();
  }

  async function saveProfile() {
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

    setSavingProfile(true);
    // RLS: solo se puede modificar el propio perfil; la base permite cambiar nombre, curso y foto
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: trimmed, curso: curso || null })
      .eq('id', session.user.id);
    setSavingProfile(false);

    if (error) {
      Alert.alert('Error', 'No se pudieron guardar los datos. Intentá de nuevo.');
      return;
    }
    await refreshProfile();
    Alert.alert('Listo', 'Tus datos fueron actualizados.');
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
      Alert.alert('No se pudo cambiar la contraseña', translateAuthError(error.message));
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Mi cuenta' }} />

      <Text style={styles.sectionTitle} accessibilityRole="header">Mi perfil</Text>
      <View style={styles.avatarBlock}>
        <Avatar path={profile?.avatar_path} name={profile?.full_name ?? profile?.email} size={96} />
        {savingAvatar ? (
          <ActivityIndicator color={colors.primary} style={styles.avatarSpinner} />
        ) : (
          <View style={styles.avatarActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={pickAvatar}
              accessibilityRole="button"
              accessibilityLabel="Cambiar foto de perfil"
            >
              <Text style={styles.secondaryButtonText}>Cambiar foto</Text>
            </TouchableOpacity>
            {!!profile?.avatar_path && (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={confirmRemoveAvatar}
                accessibilityRole="button"
                accessibilityLabel="Quitar foto de perfil"
              >
                <Text style={styles.linkDanger}>Quitar foto</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <Text style={styles.label}>Email</Text>
      <Text style={styles.readonly} accessibilityLabel={`Email: ${profile?.email ?? session.user.email}`}>
        {profile?.email ?? session.user.email}
      </Text>

      <Text style={styles.label}>Nombre</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholder="Tu nombre"
        placeholderTextColor={colors.textFaint}
        maxLength={MAX_NAME}
        accessibilityLabel="Nombre"
        autoComplete="name"
      />

      <Text style={styles.label}>Curso</Text>
      <View style={styles.chips}>
        {CURSOS.map((option) => {
          const selected = curso === option;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setCurso(selected ? '' : option)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`Curso ${option}`}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.button, savingProfile && styles.buttonDisabled]}
        onPress={saveProfile}
        disabled={savingProfile}
        accessibilityRole="button"
        accessibilityLabel="Guardar datos"
      >
        {savingProfile ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>Guardar datos</Text>}
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, styles.sectionSpacing]} accessibilityRole="header">Apariencia</Text>
      {THEME_PREFERENCES.map((option) => {
        const selected = preference === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.option, selected && styles.optionSelected]}
            onPress={() => setPreference(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.label}
          >
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
              {selected ? '● ' : '○ '}
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      <Text style={[styles.sectionTitle, styles.sectionSpacing]} accessibilityRole="header">Cambiar contraseña</Text>
      <TextInput
        placeholder="Nueva contraseña"
        placeholderTextColor={colors.textFaint}
        value={newPassword}
        onChangeText={setNewPassword}
        style={styles.input}
        secureTextEntry={!showPasswords}
        autoComplete="new-password"
        accessibilityLabel="Nueva contraseña"
      />
      <TextInput
        placeholder="Repetí la nueva contraseña"
        placeholderTextColor={colors.textFaint}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={styles.input}
        secureTextEntry={!showPasswords}
        autoComplete="new-password"
        accessibilityLabel="Repetí la nueva contraseña"
      />
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setShowPasswords((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: showPasswords }}
        accessibilityLabel="Mostrar contraseñas"
      >
        <Text style={styles.toggleText}>
          {showPasswords ? '☑' : '☐'} Mostrar contraseñas
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, savingPassword && styles.buttonDisabled]}
        onPress={savePassword}
        disabled={savingPassword}
        accessibilityRole="button"
        accessibilityLabel="Cambiar contraseña"
      >
        {savingPassword ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>Cambiar contraseña</Text>}
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, styles.sectionSpacing]} accessibilityRole="header">Pedidos</Text>
      <TouchableOpacity
        style={styles.ordersButton}
        onPress={() => router.push('/orders')}
        accessibilityRole="button"
        accessibilityLabel="Ver mis pedidos"
      >
        <Text style={styles.ordersText}>Ver mis pedidos</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.logoutButton]}
        onPress={handleSignOut}
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
      >
        <Text style={[styles.buttonText, styles.logoutText]}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surface },
    content: { padding: 20, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.surface },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: c.text },
    sectionSpacing: { marginTop: 28 },
    avatarBlock: { alignItems: 'center', marginBottom: 20 },
    avatarActions: { flexDirection: 'row', gap: 12, marginTop: 12, alignItems: 'center' },
    avatarSpinner: { marginTop: 12 },
    secondaryButton: {
      backgroundColor: c.primarySoft,
      paddingHorizontal: 16,
      minHeight: 48,
      justifyContent: 'center',
      borderRadius: 10,
    },
    secondaryButtonText: { color: c.primary, fontWeight: '600', fontSize: 15 },
    linkButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
    linkDanger: { color: c.danger, fontSize: 15 },
    label: { fontSize: 14, fontWeight: '600', color: c.textMuted, marginBottom: 6 },
    readonly: { fontSize: 16, color: c.text, marginBottom: 16 },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      paddingHorizontal: 14,
      paddingVertical: 14,
      minHeight: 48,
      borderRadius: 10,
      marginBottom: 12,
      fontSize: 16,
      color: c.text,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    chip: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 20,
      paddingHorizontal: 14,
      minHeight: 48,
      justifyContent: 'center',
    },
    chipSelected: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { color: c.text, fontSize: 15 },
    chipTextSelected: { color: c.onPrimary, fontWeight: '700' },
    button: {
      backgroundColor: c.primary,
      minHeight: 48,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    buttonDisabled: { backgroundColor: c.primaryDisabled },
    buttonText: { color: c.onPrimary, fontWeight: 'bold', fontSize: 16 },
    option: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      minHeight: 48,
      paddingHorizontal: 14,
      justifyContent: 'center',
      marginBottom: 8,
    },
    optionSelected: { borderColor: c.primary, backgroundColor: c.primarySoft },
    optionText: { color: c.text, fontSize: 16 },
    optionTextSelected: { color: c.primary, fontWeight: '700' },
    toggle: { minHeight: 48, justifyContent: 'center', marginBottom: 8 },
    toggleText: { color: c.text, fontSize: 15 },
    ordersButton: {
      borderWidth: 1,
      borderColor: c.primary,
      backgroundColor: c.primarySoft,
      minHeight: 48,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    ordersText: { color: c.primary, fontWeight: '600', fontSize: 16 },
    logoutButton: { backgroundColor: c.dangerSoft, marginTop: 32 },
    logoutText: { color: c.danger },
  });
