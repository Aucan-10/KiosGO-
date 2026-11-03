import { useMemo } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, useColors } from '../lib/theme';

// Barra de búsqueda reutilizable: campo de texto con botón para borrar
export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Buscar...',
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        autoCorrect={false}
        returnKeyType="search"
      />
      {!!value && (
        <TouchableOpacity style={styles.clearButton} onPress={() => onChangeText('')}>
          <Text style={styles.clearText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
    input: {
      flex: 1,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 16,
      color: c.text,
    },
    clearButton: { marginLeft: 8, paddingHorizontal: 10, paddingVertical: 8 },
    clearText: { color: c.textMuted, fontSize: 16, fontWeight: '600' },
  });
