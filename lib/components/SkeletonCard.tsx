import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export function SkeletonCard() {
  const { colors, isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.68, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity,
          shadowOpacity: isDark ? 0 : 0.08,
        },
      ]}
    >
      <View style={[styles.line, { backgroundColor: colors.border, width: '58%' }]} />
      <View style={[styles.line, { backgroundColor: colors.border, width: '35%' }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 188,
    borderRadius: 22,
    marginBottom: 16,
    borderWidth: 1,
    justifyContent: 'flex-end',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 2,
  },
  line: {
    height: 10,
    borderRadius: 999,
    marginBottom: 8,
  },
});
