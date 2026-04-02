import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useAuthStore } from '../../lib/stores/authStore';
import { useConsumerStore } from '../../lib/stores/consumerStore';
import { useTheme } from '../../lib/theme';

export default function ConsumerLayout() {
  const { scheme, colors } = useTheme();
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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondaryLabel,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? -2 : 2,
        },
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={88}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            style={[StyleSheet.absoluteFill, styles.tabBarBackground, { borderTopColor: colors.tabBarBorder }]}
          />
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

const styles = StyleSheet.create({
  tabBarBackground: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
