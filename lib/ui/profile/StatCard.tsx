import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';

type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
};

export function StatCard({ title, value, subtitle }: StatCardProps) {
  const { colors, spacing, radius, shadows } = useTheme();

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        {
          backgroundColor: colors.card,
          borderRadius: radius.medium + spacing.xs,
          padding: spacing.md,
          borderColor: colors.separator,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.secondaryLabel }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.value, { color: colors.label }]} numberOfLines={1}>
        {value}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.tertiaryLabel }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    marginTop: 10,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
});
