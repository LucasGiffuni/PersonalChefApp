import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, PlatformColor, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../../lib/stores/authStore';

function iosColor(name: string, fallback: string) {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

export default function ChefProfileScreen() {
  const isDark = false;
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: iosColor('systemGroupedBackground', isDark ? '#000' : '#F2F2F7') }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>Perfil</Text>

        <View style={[styles.group, { backgroundColor: iosColor('secondarySystemGroupedBackground', '#FFF') }]}>
          <Pressable
            style={[styles.row, { borderBottomColor: iosColor('separator', '#C6C6C8') }]}
            onPress={() => router.push('/(chef)/invite')}
          >
            <Text style={[styles.rowText, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>Invitaciones</Text>
            <Ionicons name="chevron-forward" size={16} color={iosColor('tertiaryLabel', '#C7C7CC')} />
          </Pressable>
          <Pressable style={styles.row} onPress={() => void signOut()}>
            <Text style={[styles.rowText, { color: iosColor('systemRed', '#FF3B30') }]}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16 },
  title: { fontSize: 34, fontWeight: '700', marginTop: 8, marginBottom: 14 },
  group: { borderRadius: 12, overflow: 'hidden' },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { fontSize: 16, fontWeight: '500' },
});
