import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import * as secureStorage from '../../lib/utils/secureStorage';
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
import { useAuthStore } from '../../lib/stores/authStore';
import { useTheme } from '../../lib/theme';

type FieldName = 'name' | 'email' | 'password' | 'code' | null;

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function RegisterChefScreen() {
  const { colors, spacing, radius, typography, shadows } = useTheme();
  const heroIconSize = spacing.xl + spacing.xl + spacing.xs;
  const fetchRole = useAuthStore((s) => s.fetchRole);
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<FieldName>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const nameError = useMemo(() => {
    if (!submitted) return null;
    if (!name.trim()) return 'Ingresá tu nombre';
    if (name.trim().length < 2) return 'Nombre demasiado corto';
    return null;
  }, [name, submitted]);

  const emailError = useMemo(() => {
    if (!submitted) return null;
    if (!email.trim()) return 'Ingresá tu email';
    if (!validateEmail(email)) return 'Email inválido';
    return null;
  }, [email, submitted]);

  const passwordError = useMemo(() => {
    if (!submitted) return null;
    if (!password) return 'Ingresá una contraseña';
    if (password.length < 6) return 'Usá al menos 6 caracteres';
    return null;
  }, [password, submitted]);

  const codeError = useMemo(() => {
    if (!submitted) return null;
    const normalized = code.trim();
    if (!normalized) return null;
    if (normalized.length < 4) return 'Código inválido';
    return null;
  }, [code, submitted]);

  const onCreateChef = async () => {
    setSubmitted(true);
    setErrorMessage(null);

    if (nameError || emailError || passwordError || codeError) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: name.trim(),
          invite_code: code.trim() || null,
        },
      },
    });

    if (error) {
      setLoading(false);
      setErrorMessage(error.message);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Si no hay sesión, Supabase requiere confirmación de email
    if (!data.session) {
      await secureStorage.setItem('pendingRole', 'chef');
      setLoading(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(auth)/verify-email');
      return;
    }

    // Sesión activa — registrar rol via RPC (security definer, bypassa RLS)
    const { error: roleError } = await supabase.rpc('register_chef');
    setLoading(false);

    if (roleError) {
      setErrorMessage(`No pudimos completar el registro: ${roleError.message}`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    await fetchRole();
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
              <Ionicons name="sparkles-outline" size={spacing.lg + spacing.sm} color={colors.primary} />
            </View>
            <Text style={[typography.title, styles.title, { color: colors.label, marginBottom: spacing.xs }]}>Crear cuenta</Text>
            <Text style={[typography.body, styles.subtitle, { color: colors.secondaryLabel }]}>Comenzá a gestionar tu cocina</Text>
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
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                placeholder="Nombre"
                placeholderTextColor={colors.tertiaryLabel}
                autoCapitalize="words"
                style={[
                  inputCommon,
                  focusedField === 'name' && { borderColor: colors.primary },
                  nameError && { borderColor: colors.danger },
                ]}
              />
              {nameError ? <Text style={[styles.errorText, { color: colors.danger }]}>{nameError}</Text> : null}

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
                  textContentType="newPassword"
                  autoComplete="new-password"
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

              <TextInput
                value={code}
                onChangeText={setCode}
                onFocus={() => setFocusedField('code')}
                onBlur={() => setFocusedField(null)}
                placeholder="Código"
                placeholderTextColor={colors.tertiaryLabel}
                autoCapitalize="characters"
                style={[
                  inputCommon,
                  focusedField === 'code' && { borderColor: colors.primary },
                  codeError && { borderColor: colors.danger },
                ]}
              />
              {codeError ? <Text style={[styles.errorText, { color: colors.danger }]}>{codeError}</Text> : null}
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
              onPress={() => void onCreateChef()}
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
              <Text style={[styles.primaryButtonText, { color: colors.card }]}>
                {loading ? 'Creando...' : 'Crear cuenta'}
              </Text>
            </Pressable>

            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Link href="/login" asChild>
                <Pressable style={styles.linkWrap}>
                  <Text style={[styles.linkText, { color: colors.primary }]}>Ya tengo cuenta</Text>
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
