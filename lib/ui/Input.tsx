import React from 'react';
import { StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

type InputProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
};

export function Input({ containerStyle, style, icon, ...props }: InputProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderRadius: radius.medium + 4,
          paddingHorizontal: spacing.sm,
        },
        containerStyle,
      ]}
    >
      {icon}
      <TextInput
        {...props}
        placeholderTextColor={colors.tertiaryLabel}
        style={[
          styles.input,
          {
            color: colors.label,
            marginLeft: icon ? spacing.xs : 0,
          },
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    fontSize: 16,
  },
});
