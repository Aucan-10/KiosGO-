import { useEffect, useState } from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { useColors } from '../lib/theme';

// Las fotos de perfil están en un bucket privado: se piden con una URL temporal
export const AVATAR_BUCKET = 'avatares';

export async function getAvatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 3600);
  return error ? null : data.signedUrl;
}

type AvatarProps = {
  path?: string | null;
  name?: string | null;
  size?: number;
};

// Foto de perfil; si no hay foto, muestra la inicial del nombre
export default function Avatar({ path, name, size = 48 }: AvatarProps) {
  const colors = useColors();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAvatarUrl(path).then((signed) => {
      if (active) setUrl(signed);
    });
    return () => {
      active = false;
    };
  }, [path]);

  const label = name ? `Foto de perfil de ${name}` : 'Foto de perfil';
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (url) {
    return <Image source={{ uri: url }} style={box} accessibilityLabel={label} />;
  }

  const initial = (name ?? '').trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={[box, styles.placeholder, { backgroundColor: colors.primarySoft }]}
      accessible
      accessibilityLabel={label}
    >
      <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: size * 0.4 }}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { justifyContent: 'center', alignItems: 'center' },
});
