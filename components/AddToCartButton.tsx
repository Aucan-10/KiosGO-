import { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors } from '../lib/theme';

type AddToCartButtonProps = {
  name: string;
  onAdd: () => void;
  disabled: boolean;
  maxReached: boolean;
};

// Botón de agregar con respuesta visual: rebota, se pone verde y dice "Agregado" un momento
export default function AddToCartButton({ name, onAdd, disabled, maxReached }: AddToCartButtonProps) {
  const colors = useColors();
  const [flash, setFlash] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function handlePress() {
    onAdd();
    setFlash(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(false), 1200);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.15, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }

  const label = flash ? '✓ Agregado' : maxReached && !disabled ? 'Máximo' : '+ Agregar';
  const background = disabled ? colors.primaryDisabled : flash ? colors.success : colors.primary;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: background }]}
        disabled={disabled}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={flash ? `${name} agregado al carrito` : `Agregar ${name} al carrito`}
        accessibilityState={{ disabled }}
      >
        <Text style={[styles.text, { color: colors.onPrimary }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 40,
    minWidth: 96,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: { fontWeight: 'bold', fontSize: 14 },
});
