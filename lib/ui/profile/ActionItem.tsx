import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';

type ActionItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
};

export function ActionItem({ icon, title, onPress }: ActionItemProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: colors.card,
          borderRadius: radius.medium + spacing.xs,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          borderColor: colors.separator,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.fill, borderRadius: radius.medium }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.label }]}>{title}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.tertiaryLabel} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    minHeight: 56,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
});
