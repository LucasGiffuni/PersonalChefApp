import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../../lib/theme';

export default function VerifyEmailScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { paddingHorizontal: spacing.md }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.fill, borderRadius: radius.large }]}>
          <Ionicons name="mail-outline" size={40} color={colors.primary} />
        </View>

        <Text style={[typography.title, styles.title, { color: colors.label }]}>
          Revisá tu email
        </Text>

        <Text style={[typography.body, styles.body, { color: colors.secondaryLabel }]}>
          Te enviamos un link de confirmación. Hacé clic en él para activar tu cuenta y después iniciá sesión.
        </Text>

        <Pressable
          onPress={() => router.replace('/login')}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.primary,
              borderRadius: radius.medium + 4,
              minHeight: spacing.xl + spacing.lg,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.card }]}>
            Volver al inicio de sesión
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  iconWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
