import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface Props {
  title: string;
  subtitle?: string;
  kicker?: string;
}

export function IOSLargeHeader({ title, subtitle, kicker }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {kicker ? <Text style={[styles.kicker, { color: colors.primary }]}>{kicker}</Text> : null}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingHorizontal: 2,
    marginBottom: 14,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 20,
  },
});
