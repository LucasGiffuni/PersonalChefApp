import React from 'react';
import { ColorValue, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../../lib/theme';

type NutritionCardProps = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

type MetricTileProps = {
  label: string;
  value: string;
  bg: ColorValue;
};

function MetricTile({ label, value, bg }: MetricTileProps) {
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: bg, borderRadius: radius.medium + 2 }]}>
      <Text style={[styles.tileValue, { color: colors.label }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: colors.secondaryLabel }]}>{label}</Text>
    </View>
  );
}

export function NutritionCard({ calories, protein, fat, carbs }: NutritionCardProps) {
  const { colors, radius, spacing, typography, shadows } = useTheme();
  const tileBg = colors.background;

  return (
    <View style={[styles.card, shadows.card, { backgroundColor: colors.card, borderRadius: radius.large, padding: spacing.md }]}>
      <Text style={[styles.title, { color: colors.label, ...typography.subtitle }]}>Información nutricional</Text>
      <View style={styles.grid}>
        <MetricTile label="Calorías" value={`${Math.round(calories)} kcal`} bg={tileBg} />
        <MetricTile label="Proteínas" value={`${protein.toFixed(1)} g`} bg={tileBg} />
        <MetricTile label="Grasas" value={`${fat.toFixed(1)} g`} bg={tileBg} />
        <MetricTile label="Carbohidratos" value={`${carbs.toFixed(1)} g`} bg={tileBg} />
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    width: '48%',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  tileValue: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
  },
  tileLabel: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
});
