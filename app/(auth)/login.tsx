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
import { useTheme } from '../../lib/theme';

function iosColor(name: string, fallback: string) {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

export default function LoginScreen() {
  const { colors, spacing } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Campos incompletos', 'Ingresá email y contraseña.');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('No se pudo iniciar sesión', error.message);
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: iosColor('systemBackground', colors.background) }]}>
      <View style={[styles.container, { paddingHorizontal: spacing.lg, paddingTop: spacing.lg }]}>
        <Text style={[styles.title, { color: iosColor('label', colors.label) }]}>Iniciar sesión</Text>
        <Text style={[styles.subtitle, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>
          Accedé a tu cuenta de chef
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

        <Pressable
          onPress={onLogin}
          disabled={loading}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed || loading ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: colors.card }]}>{loading ? 'Ingresando...' : 'Ingresar'}</Text>
        </Pressable>

        <Link href="/register" asChild>
          <Pressable style={styles.linkWrap}>
            <Text style={[styles.link, { color: iosColor('systemBlue', colors.primary) }]}>Crear cuenta de chef</Text>
          </Pressable>
        </Link>

        <Link href="/invite-register" asChild>
          <Pressable style={styles.linkWrap}>
            <Text style={[styles.link, { color: iosColor('systemBlue', colors.primary) }]}>Tengo código de invitación</Text>
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
