import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  PlatformColor,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/stores/authStore';
import { useTheme } from '../../lib/theme';

function iosColor(name: string, fallback: string) {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

export default function RegisterChefScreen() {
  const { colors, spacing } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const fetchRole = useAuthStore((s) => s.fetchRole);

  const onCreateChef = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Campos incompletos', 'Ingresá email y contraseña.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Contraseñas', 'Las contraseñas no coinciden.');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      Alert.alert('No se pudo crear la cuenta', error.message);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setLoading(false);
      Alert.alert('Revisá tu email', 'Si tenés confirmación obligatoria, confirmá tu cuenta para continuar.');
      return;
    }

    const { error: roleError } = await supabase.from('user_roles').insert({
      user_id: userId,
      role: 'chef',
    });

    setLoading(false);

    if (roleError) {
      Alert.alert('Cuenta creada con aviso', `No se pudo asignar rol chef: ${roleError.message}`);
      return;
    }

    await fetchRole();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Cuenta creada', 'Tu cuenta de chef está lista.');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: iosColor('systemBackground', colors.background) }]}>
      <View style={[styles.container, { paddingHorizontal: spacing.lg, paddingTop: spacing.lg }]}>
        <Text style={[styles.title, { color: iosColor('label', colors.label) }]}>Crear cuenta</Text>
        <Text style={[styles.subtitle, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>
          Registro para chefs
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={iosColor('tertiaryLabel', colors.tertiaryLabel)}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[
            styles.input,
            {
              backgroundColor: iosColor('secondarySystemBackground', colors.fill),
              color: iosColor('label', colors.label),
            },
          ]}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          placeholderTextColor={iosColor('tertiaryLabel', colors.tertiaryLabel)}
          secureTextEntry
          style={[
            styles.input,
            {
              backgroundColor: iosColor('secondarySystemBackground', colors.fill),
              color: iosColor('label', colors.label),
            },
          ]}
        />

        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirmar contraseña"
          placeholderTextColor={iosColor('tertiaryLabel', colors.tertiaryLabel)}
          secureTextEntry
          style={[
            styles.input,
            {
              backgroundColor: iosColor('secondarySystemBackground', colors.fill),
              color: iosColor('label', colors.label),
            },
          ]}
        />

        <Pressable
          onPress={onCreateChef}
          disabled={loading}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed || loading ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: colors.card }]}>{loading ? 'Creando...' : 'Crear cuenta de chef'}</Text>
        </Pressable>

        <Link href="/login" asChild>
          <Pressable style={styles.linkWrap}>
            <Text style={[styles.link, { color: iosColor('systemBlue', colors.primary) }]}>Ya tengo cuenta</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    marginBottom: 24,
  },
  input: {
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    fontSize: 17,
  },
  primaryButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
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
