import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../../lib/stores/authStore';
import { useTheme } from '../../lib/theme';

export default function ChefProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.label }]}>Perfil</Text>

        <View style={[styles.group, { backgroundColor: colors.card }]}>
          <Pressable
            style={[styles.row, { borderBottomColor: colors.separator }]}
            onPress={() => router.push('/(chef)/invite')}
          >
            <Text style={[styles.rowText, { color: colors.label }]}>Invitaciones</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.tertiaryLabel} />
          </Pressable>
          <Pressable style={styles.row} onPress={() => void signOut()}>
            <Text style={[styles.rowText, { color: colors.danger }]}>Cerrar sesión</Text>
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
