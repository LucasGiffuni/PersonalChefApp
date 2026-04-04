import { Redirect, useLocalSearchParams } from 'expo-router';
import * as secureStorage from '../../lib/utils/secureStorage';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, PlatformColor, View } from 'react-native';
import { useAuthStore } from '../../lib/stores/authStore';

export default function InviteCodeRoute() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    const persistCode = async () => {
      if (!code || session) return;
      const normalized = String(code).trim().toUpperCase();
      if (!normalized) return;
      await secureStorage.setItem('pendingInviteCode', normalized);
    };

    void persistCode();
  }, [code, session]);

  if (!session) {
    return <Redirect href="/invite-register" />;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Platform.OS === 'ios' ? PlatformColor('systemBlue') : '#007AFF'} />
    </View>
  );
}
