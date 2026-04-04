import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';

type FieldName = 'email' | 'password' | null;

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function LoginScreen() {
  const { colors, spacing, radius, typography, shadows } = useTheme();
  const heroIconSize = spacing.xl + spacing.xl + spacing.xs;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<FieldName>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailError = useMemo(() => {
    if (!submitted) return null;
    if (!email.trim()) return 'Ingresá tu email';
    if (!validateEmail(email)) return 'Email inválido';
    return null;
  }, [email, submitted]);

  const passwordError = useMemo(() => {
    if (!submitted) return null;
    if (!password) return 'Ingresá tu contraseña';
    return null;
  }, [password, submitted]);

  const onLogin = async () => {
    setSubmitted(true);
    setErrorMessage(null);

    if (emailError || passwordError) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const inputCommon = {
    backgroundColor: colors.fill,
    borderRadius: radius.medium + 2,
    minHeight: spacing.xl + spacing.lg,
    paddingHorizontal: spacing.md,
    color: colors.label,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  } as const;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: spacing.md,
            paddingTop: spacing.lg,
            paddingBottom: spacing.lg,
          }}
        >
          <View style={[styles.hero, { marginBottom: spacing.lg }]}>
            <View
              style={[
                styles.heroIconWrap,
                {
                  backgroundColor: colors.fill,
                  borderRadius: radius.large,
                  marginBottom: spacing.md,
                  width: heroIconSize,
                  height: heroIconSize,
                },
              ]}
            >
              <Ionicons name="restaurant-outline" size={spacing.lg + spacing.sm} color={colors.primary} />
            </View>
            <Text style={[typography.title, styles.title, { color: colors.label, marginBottom: spacing.xs }]}>Iniciar sesión</Text>
            <Text style={[typography.body, styles.subtitle, { color: colors.secondaryLabel }]}>Accedé a tu cuenta</Text>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderRadius: radius.large,
                padding: spacing.lg,
                marginTop: spacing.lg,
                ...shadows.card,
              },
            ]}
          >
            <View style={{ gap: spacing.sm }}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="Email"
                placeholderTextColor={colors.tertiaryLabel}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                style={[
                  inputCommon,
                  focusedField === 'email' && { borderColor: colors.primary },
                  emailError && { borderColor: colors.danger },
                ]}
              />
              {emailError ? <Text style={[styles.errorText, { color: colors.danger }]}>{emailError}</Text> : null}

              <View style={styles.passwordWrap}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Contraseña"
                  placeholderTextColor={colors.tertiaryLabel}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  autoComplete="password"
                  style={[
                    inputCommon,
                    styles.passwordInput,
                    focusedField === 'password' && { borderColor: colors.primary },
                    passwordError && { borderColor: colors.danger },
                  ]}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn} hitSlop={8}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.tertiaryLabel}
                  />
                </Pressable>
              </View>
              {passwordError ? <Text style={[styles.errorText, { color: colors.danger }]}>{passwordError}</Text> : null}
            </View>

            {errorMessage ? (
              <View
                style={[
                  styles.errorBanner,
                  {
                    marginTop: spacing.md,
                    backgroundColor: colors.fill,
                    borderColor: colors.danger,
                    borderRadius: radius.medium,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                  },
                ]}
              >
                <Text style={[styles.errorBannerText, { color: colors.danger }]}>{errorMessage}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => void onLogin()}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.medium + 4,
                  minHeight: spacing.xl + spacing.lg,
                  marginTop: spacing.md,
                  opacity: loading ? 0.6 : pressed ? 0.92 : 1,
                },
                shadows.button,
              ]}
            >
              <Text style={[styles.primaryButtonText, { color: colors.card }]}>{loading ? 'Ingresando...' : 'Ingresar'}</Text>
            </Pressable>

            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Link href="/register" asChild>
                <Pressable style={styles.linkWrap}>
                  <Text style={[styles.linkText, { color: colors.primary }]}>Crear cuenta</Text>
                </Pressable>
              </Link>

              <Link href="/invite-register" asChild>
                <Pressable style={styles.linkWrap}>
                  <Text style={[styles.linkText, { color: colors.primary }]}>Tengo código de invitación</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  hero: {
    alignItems: 'center',
  },
  heroIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  card: {},
  passwordWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  errorBanner: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorBannerText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  linkWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
});
