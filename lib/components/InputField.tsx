import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export function InputField({ label, error, ...props }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          {
            borderColor: error ? colors.danger : colors.border,
            color: colors.text,
            backgroundColor: colors.bg,
          },
        ]}
      />
      {!!error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    minHeight: 52,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
  },
});
