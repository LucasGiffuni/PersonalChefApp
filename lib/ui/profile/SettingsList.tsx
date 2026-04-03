import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';

export type SettingsListItem = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
};

type SettingsListProps = {
  items: SettingsListItem[];
};

export function SettingsList({ items }: SettingsListProps) {
  const { colors, spacing, radius, shadows } = useTheme();

  return (
    <View
      style={[
        styles.group,
        shadows.card,
        {
          backgroundColor: colors.card,
          borderRadius: radius.large,
          borderColor: colors.separator,
        },
      ]}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.row,
              {
                paddingHorizontal: spacing.md,
                minHeight: spacing.xl + spacing.md,
                borderBottomColor: colors.separator,
                borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.fill, borderRadius: radius.medium }]}>
              <Ionicons name={item.icon} size={18} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.label }]}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.tertiaryLabel} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
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
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
});
