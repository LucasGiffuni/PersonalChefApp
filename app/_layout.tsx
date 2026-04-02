import { Stack, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/stores/authStore';
import { useTheme } from '../lib/theme';
import { ToastViewport } from '../lib/ui';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useTheme();

  const session = useAuthStore((s) => s.session);
  const role = useAuthStore((s) => s.role);
  const isLoading = useAuthStore((s) => s.isLoading);
  const initialize = useAuthStore((s) => s.initialize);
  const fetchRole = useAuthStore((s) => s.fetchRole);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const currentState = useAuthStore.getState();
      const prevUserId = currentState.session?.user?.id ?? null;
      const nextUserId = nextSession?.user?.id ?? null;
      const userChanged = prevUserId !== nextUserId;

      console.log('[NAV] onAuthStateChange → event:', event, 'userId:', nextUserId ?? 'null');

      if (!nextUserId) {
        useAuthStore.setState({ session: null, role: null, isLoading: false });
        return;
      }

      useAuthStore.setState({
        session: nextSession,
        role: userChanged ? null : currentState.role,
      });

      if (userChanged || !currentState.role) {
        void fetchRole();
        return;
      }

      useAuthStore.setState({ isLoading: false });
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
    console.log('[NAV] guard → isLoading:', isLoading, '| session:', !!session, '| role:', role, '| seg:', segments[0]);
    if (isLoading) return;

    if (!session) {
      if (!inAuthGroup && !inInviteRoute) {
        console.log('[NAV] → replace /login');
        router.replace('/login');
      }
      return;
    }

    if (!role) {
      console.log('[NAV] → waiting for role…');
      return;
    }

    if (role === 'chef' && !inChefGroup) {
      console.log('[NAV] → replace /(chef)/recipes');
      router.replace('/(chef)/recipes');
      return;
    }

    if (role === 'consumer' && !inConsumerGroup) {
      console.log('[NAV] → replace /(consumer)/menu');
      router.replace('/(consumer)/menu');
    }
  }, [inAuthGroup, inChefGroup, inConsumerGroup, inInviteRoute, isLoading, role, router, session, segments]);

  if (isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <ToastViewport />
    </GestureHandlerRootView>
  );
}
