import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import * as secureStorage from '../../lib/utils/secureStorage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useInviteStore } from '../../lib/stores/inviteStore';
import { useTheme } from '../../lib/theme';

type FieldName = 'name' | 'email' | 'password' | 'code' | null;
type CodeStatus = 'idle' | 'validating' | 'valid' | 'invalid';

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function InviteRegisterScreen() {
  const { colors, spacing, radius, typography, shadows } = useTheme();
  const heroIconSize = spacing.xl + spacing.xl + spacing.xs;

  const validateCode = useInviteStore((s) => s.validateCode);
  const redeemCode = useInviteStore((s) => s.redeemCode);
  const fetchRole = useAuthStore((s) => s.fetchRole);
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codePrefilled, setCodePrefilled] = useState(false);
  const [codeStatus, setCodeStatus] = useState<CodeStatus>('idle');

  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<FieldName>(null);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const nameError = useMemo(() => {
    if (!submitted) return null;
    if (!displayName.trim()) return 'Ingresá tu nombre';
    if (displayName.trim().length < 2) return 'Nombre demasiado corto';
    return null;
  }, [displayName, submitted]);

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
    if (!code.trim()) return 'Ingresá el código de invitación';
    return null;
  }, [code, submitted]);

  const canSubmit = !!displayName.trim() && !!email.trim() && !!password && !!code.trim();

  const runValidate = async (value: string) => {
    const clean = value.trim().toUpperCase();
    if (!clean) {
      setCodeStatus('idle');
      return;
    }
    setCodeStatus('validating');
    const result = await validateCode(clean);
    setCodeStatus(result.valid ? 'valid' : 'invalid');
  };

  useEffect(() => {
    const loadPendingCode = async () => {
      const pending = await secureStorage.getItem('pendingInviteCode');
      if (!pending) return;
      const normalized = pending.toUpperCase();
      setCode(normalized);
      setCodePrefilled(true);
      await runValidate(normalized);
    };
    void loadPendingCode();
  }, []);

  const inputCommon = {
    backgroundColor: colors.fill,
    borderRadius: radius.medium + 2,
    minHeight: spacing.xl + spacing.lg,
    paddingHorizontal: spacing.md,
    color: colors.label,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    fontSize: 16,
  } as const;

  const onSubmit = async () => {
    setSubmitted(true);
    setErrorMessage(null);

    if (nameError || emailError || passwordError || codeError) return;
    if (!canSubmit) return;

    if (codeStatus === 'invalid') {
      setErrorMessage('El código ingresado es inválido o expirado.');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    const normalizedCode = code.trim().toUpperCase();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: displayName.trim() } },
    });

    if (error) {
      setLoading(false);
      setErrorMessage(error.message);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setLoading(false);
      setErrorMessage('No se pudo crear la cuenta. Intentá de nuevo.');
      return;
    }

    // Email confirmation required — guardar para completar después
    if (!data.session) {
      await secureStorage.setItem('pendingInviteCode', normalizedCode);
      await secureStorage.setItem('pendingDisplayName', displayName.trim());
      setLoading(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(auth)/verify-email');
      return;
    }

    // Sesión activa — redimir código (RPC crea user_roles + chef_consumers)
    try {
      await redeemCode(normalizedCode, userId);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.message ?? 'No se pudo aplicar el código de invitación.');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    await supabase.from('consumer_profiles').upsert(
      { user_id: userId, display_name: displayName.trim() },
      { onConflict: 'user_id' }
    );

    await secureStorage.deleteItem('pendingInviteCode');
    setLoading(false);
    await fetchRole();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

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
          {/* Hero */}
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
              <Ionicons name="ticket-outline" size={spacing.lg + spacing.sm} color={colors.primary} />
            </View>
            <Text style={[typography.title, styles.title, { color: colors.label, marginBottom: spacing.xs }]}>
              Registro por invitación
            </Text>
            <Text style={[typography.body, styles.subtitle, { color: colors.secondaryLabel }]}>
              Ingresá el código que te compartió tu chef
            </Text>
          </View>

          {/* Form card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderRadius: radius.large,
                padding: spacing.lg,
                ...shadows.card,
              },
            ]}
          >
            <View style={{ gap: spacing.sm }}>
              {/* Nombre */}
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                placeholder="Nombre completo"
                placeholderTextColor={colors.tertiaryLabel}
                autoCapitalize="words"
                textContentType="name"
                autoComplete="name"
                style={[
                  inputCommon,
                  focusedField === 'name' && { borderColor: colors.primary },
                  nameError && { borderColor: colors.danger },
                ]}
              />
              {nameError ? <Text style={[styles.fieldError, { color: colors.danger }]}>{nameError}</Text> : null}

              {/* Email */}
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
              {emailError ? <Text style={[styles.fieldError, { color: colors.danger }]}>{emailError}</Text> : null}

              {/* Contraseña */}
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
              {passwordError ? <Text style={[styles.fieldError, { color: colors.danger }]}>{passwordError}</Text> : null}

              {/* Código de invitación */}
              <View style={styles.codeRow}>
                <TextInput
                  value={code}
                  onChangeText={(v) => {
                    setCode(v.toUpperCase());
                    setCodeStatus('idle');
                  }}
                  onFocus={() => setFocusedField('code')}
                  onBlur={() => {
                    setFocusedField(null);
                    if (code.trim()) void runValidate(code);
                  }}
                  placeholder="Código de invitación"
                  placeholderTextColor={colors.tertiaryLabel}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!loading && !codePrefilled}
                  style={[
                    inputCommon,
                    styles.codeInput,
                    focusedField === 'code' && { borderColor: colors.primary },
                    codeStatus === 'valid' && { borderColor: colors.success },
                    codeStatus === 'invalid' && { borderColor: colors.danger },
                    codeError && { borderColor: colors.danger },
                    codePrefilled && { opacity: 0.7 },
                  ]}
                />
                <Pressable
                  onPress={() => void runValidate(code)}
                  disabled={!code.trim() || codeStatus === 'validating' || loading || codePrefilled}
                  style={[
                    styles.verifyBtn,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: radius.medium + 2,
                      opacity: !code.trim() || codeStatus === 'validating' || loading || codePrefilled ? 0.4 : 1,
                    },
                  ]}
                >
                  {codeStatus === 'validating' ? (
                    <ActivityIndicator size="small" color={colors.card} />
                  ) : (
                    <Text style={[styles.verifyBtnText, { color: colors.card }]}>Verificar</Text>
                  )}
                </Pressable>
              </View>

              {codeError ? (
                <Text style={[styles.fieldError, { color: colors.danger }]}>{codeError}</Text>
              ) : codeStatus === 'valid' ? (
                <View style={styles.codeBadgeRow}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.success} />
                  <Text style={[styles.codeBadgeText, { color: colors.success }]}>Código válido</Text>
                </View>
              ) : codeStatus === 'invalid' ? (
                <View style={styles.codeBadgeRow}>
                  <Ionicons name="close-circle" size={15} color={colors.danger} />
                  <Text style={[styles.codeBadgeText, { color: colors.danger }]}>Código inválido o expirado</Text>
                </View>
              ) : null}
            </View>

            {/* Error banner */}
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

            {/* Submit */}
            <Pressable
              onPress={() => void onSubmit()}
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
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </Text>
            </Pressable>

            {/* Links */}
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Link href="/login" asChild>
                <Pressable style={styles.linkWrap}>
                  <Text style={[styles.linkText, { color: colors.primary }]}>Ya tengo cuenta</Text>
                </Pressable>
              </Link>
              <Link href="/register" asChild>
                <Pressable style={styles.linkWrap}>
                  <Text style={[styles.linkText, { color: colors.primary }]}>Registrarme como chef</Text>
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
  safe: { flex: 1 },
  flex: { flex: 1 },
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
  hero: { alignItems: 'center' },
  heroIconWrap: { alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  card: {},
  fieldError: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  codeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  verifyBtn: {
    height: 56,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  codeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  codeBadgeText: {
    fontSize: 12,
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
