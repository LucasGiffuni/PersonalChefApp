import React, { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

type SectionProps = PropsWithChildren<{
  title: string;
  style?: StyleProp<ViewStyle>;
}>;

export function Section({ title, children, style }: SectionProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={style}>
      <Text
        style={[
          styles.title,
          {
            color: colors.secondaryLabel,
            marginBottom: spacing.xs,
            ...typography.caption,
          },
        ]}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    paddingHorizontal: 4,
  },
});
