import { Stack } from 'expo-router';
import React from 'react';
import { Platform, PlatformColor, useColorScheme } from 'react-native';

function getSystemBackground(isDark: boolean) {
  if (Platform.OS === 'ios') return PlatformColor('systemBackground');
  return isDark ? '#000000' : '#FFFFFF';
}

export default function AuthLayout() {
  const isDark = useColorScheme() === 'dark';

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: getSystemBackground(isDark),
        },
      }}
    />
  );
}
