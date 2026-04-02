import React, { PropsWithChildren } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

type PrimaryButtonProps = PropsWithChildren<{
  title?: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function PrimaryButton({ title, children, onPress, disabled, style }: PrimaryButtonProps) {
  const { colors, radius, spacing, shadows } = useTheme();
  const label = title ?? String(children ?? '');

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: 54,
          borderRadius: radius.medium + 4,
          backgroundColor: colors.primary,
          paddingHorizontal: spacing.lg,
          opacity: disabled ? 0.55 : pressed ? 0.92 : 1,
        },
        shadows.button,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.text, { color: colors.card }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
});
