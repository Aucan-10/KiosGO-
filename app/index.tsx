import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

export default function HomeScreen() {
  const [email, setEmail] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Cargar el email del usuario actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setEmail(session.user.email);
      }
    });
  }, []);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error', 'No se pudo cerrar sesión');
    } else {
      router.replace('/login');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenido a KiosGo! </Text>
      <Text style={styles.email}>Sesión iniciada como: {email}</Text>
      
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Aquí irá el catálogo de productos y el carrito.
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  email: { fontSize: 16, color: '#555', marginBottom: 40 },
  placeholder: { backgroundColor: '#f0f0f0', padding: 30, borderRadius: 15, marginBottom: 40, width: '100%' },
  placeholderText: { textAlign: 'center', color: '#888' },
  logoutButton: { backgroundColor: '#FF3B30', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});