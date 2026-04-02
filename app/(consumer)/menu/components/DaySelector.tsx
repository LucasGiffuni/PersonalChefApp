import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../../lib/theme';

export const DAY_OPTIONS = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
] as const;

type DaySelectorProps = {
  selectedDays: string[];
  onToggleDay: (day: string) => void;
};

export function DaySelector({ selectedDays, onToggleDay }: DaySelectorProps) {
  const { colors, radius, spacing, typography, shadows } = useTheme();
  const inactiveChipBg = colors.background;

  return (
    <View style={[styles.card, shadows.card, { backgroundColor: colors.card, borderRadius: radius.large, paddingVertical: spacing.md }]}>
      <Text style={[styles.title, { color: colors.label, ...typography.subtitle, paddingHorizontal: spacing.md }]}>Días de entrega</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {DAY_OPTIONS.map((day) => {
          const active = selectedDays.includes(day.key);
          return (
            <Pressable
              key={day.key}
              accessibilityRole="button"
              onPress={() => onToggleDay(day.key)}
              style={({ pressed }) => [
                styles.dayChip,
                {
                  backgroundColor: active ? colors.primary : inactiveChipBg,
                },
                pressed && styles.dayChipPressed,
              ]}
            >
              <Text style={[styles.dayText, { color: active ? colors.card : colors.label }]}>{day.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
  },
  title: {
    marginBottom: 12,
  },
  content: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dayChip: {
    height: 42,
    borderRadius: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  dayText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
});
