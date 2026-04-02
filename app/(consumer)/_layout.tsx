import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, PlatformColor, StyleSheet, useColorScheme } from 'react-native';
import { useAuthStore } from '../../lib/stores/authStore';
import { useConsumerStore } from '../../lib/stores/consumerStore';

function iosColor(name: string, fallback: string) {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

export default function ConsumerLayout() {
  const isDark = useColorScheme() === 'dark';
  const session = useAuthStore((s) => s.session);
  const initialize = useConsumerStore((s) => s.initialize);
  const clear = useConsumerStore((s) => s.clear);

  useEffect(() => {
    const consumerId = session?.user?.id;
    if (!consumerId) {
      clear();
      return;
    }
    void initialize(consumerId);
  }, [clear, initialize, session?.user?.id]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: iosColor('systemBlue', '#007AFF'),
        tabBarInactiveTintColor: iosColor('secondaryLabel', '#8E8E93'),
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => (
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ),
      }}
    >
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menú',
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="week"
        options={{
          title: 'Mi semana',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
