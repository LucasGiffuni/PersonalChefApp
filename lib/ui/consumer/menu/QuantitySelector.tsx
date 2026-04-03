import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../theme';

type QuantitySelectorProps = {
  value: number;
  onChange: (next: number) => void;
};

export function QuantitySelector({ value, onChange }: QuantitySelectorProps) {
  const { colors, radius, spacing, typography, shadows } = useTheme();
  const buttonBg = colors.background;
  const decrease = () => onChange(Math.max(1, value - 1));
  const increase = () => onChange(value + 1);

  return (
    <View style={[styles.card, shadows.card, { backgroundColor: colors.card, borderRadius: radius.large, padding: spacing.md }]}>
      <Text style={[styles.title, { color: colors.label, ...typography.subtitle }]}>Cantidad</Text>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" onPress={decrease} style={({ pressed }) => [styles.button, { backgroundColor: buttonBg }, pressed && styles.buttonPressed]}>
          <Ionicons name="remove" size={18} color={colors.label} />
        </Pressable>

        <Text style={[styles.value, { color: colors.label }]}>{value} personas</Text>

        <Pressable accessibilityRole="button" onPress={increase} style={({ pressed }) => [styles.button, { backgroundColor: buttonBg }, pressed && styles.buttonPressed]}>
          <Ionicons name="add" size={18} color={colors.label} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
  },
  title: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  value: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
});
