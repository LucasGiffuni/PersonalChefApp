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
  useColorScheme,
} from 'react-native';
import { supabase } from '../../lib/supabase';

function iosColor(name: string, fallback: string) {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

export default function LoginScreen() {
  const isDark = useColorScheme() === 'dark';
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
    <SafeAreaView style={[styles.safe, { backgroundColor: iosColor('systemBackground', isDark ? '#000' : '#FFF') }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>Iniciar sesión</Text>
        <Text style={[styles.subtitle, { color: iosColor('secondaryLabel', isDark ? '#A0A0A0' : '#6B6B6B') }]}>
          Accedé a tu cuenta de chef
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={iosColor('tertiaryLabel', '#8A8A8E')}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[
            styles.input,
            {
              backgroundColor: iosColor('secondarySystemBackground', isDark ? '#1C1C1E' : '#F2F2F7'),
              color: iosColor('label', isDark ? '#FFF' : '#000'),
            },
          ]}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          placeholderTextColor={iosColor('tertiaryLabel', '#8A8A8E')}
          secureTextEntry
          style={[
            styles.input,
            {
              backgroundColor: iosColor('secondarySystemBackground', isDark ? '#1C1C1E' : '#F2F2F7'),
              color: iosColor('label', isDark ? '#FFF' : '#000'),
            },
          ]}
        />

        <Pressable
          onPress={onLogin}
          disabled={loading}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: '#007AFF',
              opacity: pressed || loading ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.primaryButtonText}>{loading ? 'Ingresando...' : 'Ingresar'}</Text>
        </Pressable>

        <Link href="/register" asChild>
          <Pressable style={styles.linkWrap}>
            <Text style={[styles.link, { color: iosColor('systemBlue', '#007AFF') }]}>Crear cuenta de chef</Text>
          </Pressable>
        </Link>

        <Link href="/invite-register" asChild>
          <Pressable style={styles.linkWrap}>
            <Text style={[styles.link, { color: iosColor('systemBlue', '#007AFF') }]}>Tengo código de invitación</Text>
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
