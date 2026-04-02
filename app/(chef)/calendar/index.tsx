import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../lib/theme';

export default function ChefCalendarScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.label }]}>Calendario</Text>

        <Pressable
          style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, pressed && styles.buttonPressed]}
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(chef)/calendar/orders');
          }}
        >
          <Text style={[styles.primaryButtonText, { color: colors.card }]}>Pedidos por cliente</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            { backgroundColor: colors.card, borderColor: colors.separator },
            pressed && styles.buttonPressed,
          ]}
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(chef)/calendar/production');
          }}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Producción semanal</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, padding: 20 },
  title: { fontSize: 34, fontWeight: '700', marginTop: 8, marginBottom: 24 },
  primaryButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { fontSize: 17, fontWeight: '600' },
  secondaryButton: {
    marginTop: 10,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryButtonText: { fontSize: 17, fontWeight: '600' },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
