import { Stack, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as secureStorage from '../lib/utils/secureStorage';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerForPushNotifications } from '../lib/services/pushNotifications';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/stores/authStore';
import { useTheme } from '../lib/theme';
import { ToastViewport } from '../lib/ui';
import { showToast } from '../lib/utils/toast';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
        await secureStorage.setItem('pendingInviteCode', inviteCode);
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

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    void registerForPushNotifications(userId);
  }, [session?.user?.id]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener((notification) => {
      const message =
        notification.request.content.body ??
        notification.request.content.title ??
        'Nueva notificación';
      showToast({ type: 'info', message });
    });

    return () => {
      received.remove();
    };
  }, []);

  // Completa el registro de usuarios que confirmaron email después del signup
  useEffect(() => {
    if (isLoading || !session || role) return;

    const bootstrap = async () => {
      const userId = session.user.id;
      const pendingRole = await secureStorage.getItem('pendingRole');
      const pendingInviteCode = await secureStorage.getItem('pendingInviteCode');
      const pendingDisplayName = await secureStorage.getItem('pendingDisplayName');

      if (pendingRole === 'chef') {
        const { error } = await supabase.rpc('register_chef');
        if (!error) {
          await secureStorage.deleteItem('pendingRole');
        }
      } else if (pendingInviteCode) {
        const { error } = await supabase.rpc('redeem_invite_code', {
          p_code: pendingInviteCode,
          p_consumer_id: userId,
        });
        if (!error) {
          await secureStorage.deleteItem('pendingInviteCode');
          if (pendingDisplayName) {
            await supabase
              .from('consumer_profiles')
              .upsert({ user_id: userId, display_name: pendingDisplayName }, { onConflict: 'user_id' });
            await secureStorage.deleteItem('pendingDisplayName');
          }
        }
      }

      void fetchRole();
    };

    void bootstrap();
  }, [isLoading, session, role, fetchRole]);

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
