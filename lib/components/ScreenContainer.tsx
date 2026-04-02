import React, { PropsWithChildren } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export function ScreenContainer({ children }: PropsWithChildren) {
  const { colors } = useTheme();

  return <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
