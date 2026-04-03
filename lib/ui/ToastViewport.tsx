import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { subscribeToast, ToastInput } from '../utils/toast';

type ActiveToast = Required<ToastInput>;

export function ToastViewport() {
  const { colors, radius, spacing, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToast((nextToast) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setToast(nextToast);
      opacity.setValue(0);
      translateY.setValue(-16);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      timeoutRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -12,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start(() => setToast(null));
      }, nextToast.duration);
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [opacity, translateY]);

  if (!toast) return null;

  const toneColor =
    toast.type === 'success'
      ? colors.success
      : toast.type === 'error'
        ? colors.danger
        : toast.type === 'warning'
          ? colors.warning
          : colors.primary;
  const iconName =
    toast.type === 'success'
      ? 'checkmark-circle'
      : toast.type === 'error'
        ? 'alert-circle'
        : toast.type === 'warning'
          ? 'warning'
          : 'information-circle';

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + spacing.sm }]}>
      <Animated.View
        style={[
          styles.toast,
          shadows.card,
          {
            backgroundColor: colors.card,
            borderRadius: radius.medium + 2,
            borderColor: colors.separator,
            paddingHorizontal: spacing.sm,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Ionicons name={iconName} size={18} color={toneColor} />
        <Text style={[styles.message, { color: colors.label }]} numberOfLines={2}>
          {toast.message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
    alignItems: 'center',
  },
  toast: {
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  message: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
});
