import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, typography } from '../theme/tokens';

interface Props {
  title: string;
}

export function SectionHeader({ title }: Props) {
  const { colors } = useTheme();
  return <Text style={[styles.text, { color: colors.text }]}>{title}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: typography.subtitle,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: spacing.md,
  },
});
