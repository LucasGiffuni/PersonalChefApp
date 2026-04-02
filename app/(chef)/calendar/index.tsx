import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, PlatformColor, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

function iosColor(name: string, fallback: string) {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

export default function ChefCalendarScreen() {
  const isDark = false;
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: iosColor('systemBackground', isDark ? '#000' : '#FFF') }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>Calendario</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/(chef)/calendar/orders')}>
          <Text style={styles.primaryButtonText}>Ver resumen semanal</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, padding: 20 },
  title: { fontSize: 34, fontWeight: '700', marginTop: 8, marginBottom: 24 },
  primaryButton: { height: 50, borderRadius: 12, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
});
