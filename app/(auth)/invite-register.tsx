import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  PlatformColor,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/stores/authStore';
import { useInviteStore } from '../../lib/stores/inviteStore';

function iosColor(name: string, fallback: string) {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

type FieldRowProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  keyboardType?: 'default' | 'email-address';
  editable?: boolean;
  isLast?: boolean;
};

function FieldRow({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType = 'default',
  editable = true,
  isLast = false,
}: FieldRowProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: iosColor('separator', isDark ? '#3A3A3C' : '#C6C6C8'),
        },
      ]}
    >
      <Text style={[styles.rowLabel, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={iosColor('tertiaryLabel', '#8A8A8E')}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        editable={editable}
        style={[styles.rowInput, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}
      />
    </View>
  );
}

export default function InviteRegisterScreen() {
  const isDark = useColorScheme() === 'dark';
  const validateCode = useInviteStore((s) => s.validateCode);
  const redeemCode = useInviteStore((s) => s.redeemCode);
  const fetchRole = useAuthStore((s) => s.fetchRole);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [codeMessage, setCodeMessage] = useState<string | null>(null);
  const [codePrefilled, setCodePrefilled] = useState(false);

  const canSubmit = useMemo(() => {
    return !!displayName.trim() && !!email.trim() && !!password && !!code.trim();
  }, [displayName, email, password, code]);

  const runValidate = async (value: string) => {
    const clean = value.trim().toUpperCase();
    if (!clean) {
      setCodeMessage(null);
      return;
    }

    setValidating(true);
    const result = await validateCode(clean);
    setValidating(false);

    if (result.valid) {
      const chefText = result.chefName ?? (result.chefId ? `ID ${result.chefId.slice(0, 8)}` : 'Chef asignado');
      setCodeMessage(`Código válido · Chef: ${chefText}`);
    } else {
      setCodeMessage('Código inválido o expirado');
    }
  };

  useEffect(() => {
    const loadPendingCode = async () => {
      const pending = await SecureStore.getItemAsync('pendingInviteCode');
      if (!pending) return;

      const normalized = pending.toUpperCase();
      setCode(normalized);
      setCodePrefilled(true);
      await runValidate(normalized);
    };

    void loadPendingCode();
  }, []);

  const onCreateConsumer = async () => {
    if (!canSubmit) {
      Alert.alert('Campos incompletos', 'Completá nombre, email, contraseña y código.');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    const normalizedCode = code.trim().toUpperCase();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: displayName.trim(),
        },
      },
    });

    if (error) {
      setLoading(false);
      Alert.alert('No se pudo crear la cuenta', error.message);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setLoading(false);
      Alert.alert('Revisá tu email', 'Tu cuenta requiere confirmación para continuar.');
      return;
    }

    try {
      await redeemCode(normalizedCode, userId);
    } catch (error: any) {
      setLoading(false);
      Alert.alert('No se pudo aplicar el código', error?.message ?? 'Error desconocido');
      return;
    }

    const { error: profileError } = await supabase.from('consumer_profiles').upsert(
      {
        user_id: userId,
        display_name: displayName.trim(),
      },
      { onConflict: 'user_id' }
    );

    setLoading(false);

    if (profileError) {
      Alert.alert('Cuenta creada con aviso', profileError.message);
      return;
    }

    await SecureStore.deleteItemAsync('pendingInviteCode');
    await fetchRole();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Cuenta creada', 'Tu cuenta de consumidor ya está vinculada a tu chef.');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: iosColor('systemBackground', isDark ? '#000' : '#FFF') }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <Text style={[styles.title, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>Registro por invitación</Text>
            <Text style={[styles.subtitle, { color: iosColor('secondaryLabel', isDark ? '#A0A0A0' : '#6B6B6B') }]}>
              Ingresá tus datos para crear cuenta de consumidor.
            </Text>

            <View
              style={[
                styles.group,
                {
                  backgroundColor: iosColor('secondarySystemBackground', isDark ? '#1C1C1E' : '#F2F2F7'),
                },
              ]}
            >
              <FieldRow
                label="Tu nombre"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Nombre y apellido"
                autoCapitalize="words"
              />
              <FieldRow
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                keyboardType="email-address"
              />
              <FieldRow
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 6 caracteres"
                secureTextEntry
              />
              <FieldRow
                label="Código"
                value={code}
                onChangeText={(value) => setCode(value.toUpperCase())}
                placeholder="ABC234XY"
                autoCapitalize="characters"
                editable={!loading && !codePrefilled}
                isLast
              />
            </View>

            <Pressable onPress={() => void runValidate(code)} disabled={validating || loading} style={styles.validateWrap}>
              <Text style={[styles.validateLink, { color: iosColor('systemBlue', '#007AFF') }]}>
                {validating ? 'Validando...' : 'Validar código'}
              </Text>
            </Pressable>

            {codeMessage ? (
              <Text
                style={[
                  styles.codeMessage,
                  {
                    color: codeMessage.startsWith('Código válido')
                      ? iosColor('systemGreen', '#34C759')
                      : iosColor('systemRed', '#FF3B30'),
                  },
                ]}
              >
                {codeMessage}
              </Text>
            ) : null}

            <Pressable
              onPress={onCreateConsumer}
              disabled={!canSubmit || loading}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: '#007AFF',
                  opacity: pressed || loading || !canSubmit ? 0.6 : 1,
                },
              ]}
            >
              <Text style={styles.primaryButtonText}>{loading ? 'Creando...' : 'Crear cuenta'}</Text>
            </Pressable>

            <Link href="/login" asChild>
              <Pressable style={styles.linkWrap}>
                <Text style={[styles.link, { color: iosColor('systemBlue', '#007AFF') }]}>Ya tengo cuenta</Text>
              </Pressable>
            </Link>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    marginBottom: 18,
  },
  group: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  rowLabel: {
    width: 110,
    fontSize: 16,
    fontWeight: '600',
  },
  rowInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    textAlign: 'right',
  },
  validateWrap: {
    marginTop: 12,
  },
  validateLink: {
    fontSize: 15,
    fontWeight: '600',
  },
  codeMessage: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  linkWrap: {
    marginTop: 18,
    alignItems: 'center',
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
  },
});
