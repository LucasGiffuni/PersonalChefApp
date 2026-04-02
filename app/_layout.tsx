import { Stack, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, PlatformColor, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/stores/authStore';

function getSystemBackground() {
  if (Platform.OS === 'ios') return PlatformColor('systemBackground');
  return '#FFFFFF';
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const bgColor = getSystemBackground();

  const session = useAuthStore((s) => s.session);
  const role = useAuthStore((s) => s.role);
  const isLoading = useAuthStore((s) => s.isLoading);
  const initialize = useAuthStore((s) => s.initialize);
  const fetchRole = useAuthStore((s) => s.fetchRole);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      useAuthStore.setState({ session: nextSession, role: null });
      if (nextSession?.user?.id) {
        await fetchRole();
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchRole]);

  useEffect(() => {
    const handleUrl = async (url: string) => {
      const { path } = Linking.parse(url);
      const match = (path ?? '').match(/^invite\/([^/?#]+)/i);
      if (!match) return;

      const inviteCode = decodeURIComponent(match[1]).trim().toUpperCase();
      if (!inviteCode) return;

      if (!useAuthStore.getState().session) {
        await SecureStore.setItemAsync('pendingInviteCode', inviteCode);
        router.replace('/invite-register');
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) {
        void handleUrl(url);
      }
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => subscription.remove();
  }, [router]);

  const inAuthGroup = segments[0] === '(auth)';
  const inChefGroup = segments[0] === '(chef)';
  const inConsumerGroup = segments[0] === '(consumer)';
  const inInviteRoute = segments[0] === 'invite';

  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      if (!inAuthGroup && !inInviteRoute) {
        router.replace('/login');
      }
      return;
    }

    if (!role) return;

    if (role === 'chef' && !inChefGroup) {
      router.replace('/(chef)/recipes');
      return;
    }

    if (role === 'consumer' && !inConsumerGroup) {
      router.replace('/(consumer)/menu');
    }
  }, [inAuthGroup, inChefGroup, inConsumerGroup, inInviteRoute, isLoading, role, router, session]);

  if (isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: bgColor }}>
          <ActivityIndicator size="large" color={Platform.OS === 'ios' ? PlatformColor('systemBlue') : '#007AFF'} />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
