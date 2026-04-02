import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme } from './tokens';

export function useTheme() {
  const scheme = useColorScheme();

  return useMemo(() => {
    const active = scheme === 'dark' ? darkTheme : lightTheme;
    return {
      scheme: scheme ?? 'light',
      colors: active.colors,
      spacing: active.spacing,
      radius: active.radius,
      typography: active.typography,
      shadows: active.shadows,
    };
  }, [scheme]);
}
