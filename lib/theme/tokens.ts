export type ColorTokens = {
  background: string;
  card: string;
  label: string;
  onImage: string;
  secondaryLabel: string;
  tertiaryLabel: string;
  separator: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
  tabBarBorder: string;
  overlaySoft: string;
  overlayStrong: string;
  fill: string;
  fillStrong: string;
};

export type SpacingTokens = {
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
};

export type RadiusTokens = {
  small: number;
  medium: number;
  large: number;
  pill: number;
};

export type TypographyTokens = {
  title: { fontSize: number; lineHeight: number; fontWeight: '800' };
  subtitle: { fontSize: number; lineHeight: number; fontWeight: '600' };
  body: { fontSize: number; lineHeight: number; fontWeight: '500' };
  caption: { fontSize: number; lineHeight: number; fontWeight: '600' };
};

export type ShadowTokens = {
  card: {
    shadowColor: string;
    shadowOpacity: number;
    shadowOffset: { width: number; height: number };
    shadowRadius: number;
    elevation: number;
  };
  button: {
    shadowColor: string;
    shadowOpacity: number;
    shadowOffset: { width: number; height: number };
    shadowRadius: number;
    elevation: number;
  };
};

export type ThemeTokens = {
  colors: ColorTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  typography: TypographyTokens;
  shadows: ShadowTokens;
};

const spacing: SpacingTokens = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

const radius: RadiusTokens = {
  small: 8,
  medium: 12,
  large: 20,
  pill: 999,
};

const typography: TypographyTokens = {
  title: { fontSize: 34, lineHeight: 40, fontWeight: '800' },
  subtitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
};

const lightColors: ColorTokens = {
  background: '#F8F9FB',
  card: '#FFFFFF',
  label: '#111827',
  onImage: '#FFFFFF',
  secondaryLabel: '#6B7280',
  tertiaryLabel: '#9CA3AF',
  separator: 'rgba(107,114,128,0.28)',

  primary: '#2563EB',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',

  tabBarBorder: 'rgba(107,114,128,0.18)',

  overlaySoft: 'rgba(17,24,39,0.06)',
  overlayStrong: 'rgba(17,24,39,0.24)',

  fill: '#EEF2F7',
  fillStrong: '#E5EAF2',
};

const darkColors: ColorTokens = {
  background: '#1C1F26',
  card: '#262B34',
  label: '#E5E7EB',
  onImage: '#FFFFFF',
  secondaryLabel: '#A1AAB7',
  tertiaryLabel: '#7E8795',
  separator: 'rgba(156,163,175,0.28)',

  primary: '#3B82F6',
  success: '#46D37A',
  warning: '#FFB454',
  danger: '#FF6B63',

  tabBarBorder: 'rgba(156,163,175,0.24)',

  overlaySoft: 'rgba(12,18,28,0.20)',
  overlayStrong: 'rgba(12,18,28,0.46)',

  fill: '#2F3541',
  fillStrong: '#3A4150',
};

const lightShadows: ShadowTokens = {
  card: {
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 2,
  },
  button: {
    shadowColor: '#2C6FD6',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
};

const darkShadows: ShadowTokens = {
  card: {
    shadowColor: '#0B101A',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  button: {
    shadowColor: '#2D6ED6',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 5,
  },
};

export const lightTheme: ThemeTokens = {
  colors: lightColors,
  spacing,
  radius,
  typography,
  shadows: lightShadows,
};

export const darkTheme: ThemeTokens = {
  colors: darkColors,
  spacing,
  radius,
  typography,
  shadows: darkShadows,
};
