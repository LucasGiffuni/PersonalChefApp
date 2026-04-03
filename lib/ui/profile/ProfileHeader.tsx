import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';

type ProfileHeaderProps = {
  name: string;
  email: string;
};

function initialsFromName(name: string, email: string) {
  const clean = name.trim();
  if (clean) {
    const parts = clean.split(' ').filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? '';
    return `${first}${second || ''}`.toUpperCase();
  }
  return (email.slice(0, 2) || 'U').toUpperCase();
}

export function ProfileHeader({ name, email }: ProfileHeaderProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const initials = useMemo(() => initialsFromName(name, email), [name, email]);

  return (
    <View style={[styles.wrap, { marginTop: spacing.lg }]}>
      <View
        style={[
          styles.avatar,
          {
            width: spacing.xl + spacing.xl + spacing.xs,
            height: spacing.xl + spacing.xl + spacing.xs,
            borderRadius: radius.large + spacing.xs,
            backgroundColor: colors.fill,
            marginBottom: spacing.sm,
          },
        ]}
      >
        <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
      </View>

      <Text style={[typography.subtitle, styles.name, { color: colors.label }]} numberOfLines={1}>
        {name.trim() || 'Usuario'}
      </Text>
      <Text style={[typography.caption, styles.email, { color: colors.secondaryLabel }]} numberOfLines={1}>
        {email}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  name: {
    textAlign: 'center',
  },
  email: {
    marginTop: 4,
    textAlign: 'center',
  },
});
