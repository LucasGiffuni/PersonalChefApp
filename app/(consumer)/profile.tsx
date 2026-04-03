import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/stores/authStore';
import { useConsumerStore } from '../../lib/stores/consumerStore';
import { useTheme } from '../../lib/theme';
import { showToast } from '../../lib/utils/toast';
import { ActionItem, ProfileHeader, SettingsList, type SettingsListItem, StatCard } from '../../lib/ui/profile';

type IngredientLike = {
  grams?: unknown;
  caloriesPer100g?: unknown;
  calories_per_100g?: unknown;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function estimateRecipeCalories(ingredients: unknown) {
  if (!Array.isArray(ingredients)) return 0;
  return (ingredients as IngredientLike[]).reduce((total, ingredient) => {
    const grams = toNumber(ingredient.grams);
    const caloriesPer100g = toNumber(ingredient.caloriesPer100g ?? ingredient.calories_per_100g);
    return total + (grams / 100) * caloriesPer100g;
  }, 0);
}

export default function ConsumerProfileScreen() {
  const router = useRouter();
  const { colors, spacing, radius, typography } = useTheme();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const clearConsumerStore = useConsumerStore((s) => s.clear);
  const planItems = useConsumerStore((s) => s.planItems);
  const favorites = useConsumerStore((s) => s.favorites);
  const chefId = useConsumerStore((s) => s.chefId);
  const linkedAt = useConsumerStore((s) => s.linkedAt);

  const [displayName, setDisplayName] = useState('');
  const enterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [enterAnim]);

  useEffect(() => {
    const loadProfile = async () => {
      const userId = session?.user?.id;
      if (!userId) return;

      const { data } = await supabase
        .from('consumer_profiles')
        .select('display_name')
        .eq('user_id', userId)
        .maybeSingle();

      if (data?.display_name) {
        setDisplayName(data.display_name);
        return;
      }

      const fallbackName = String(session?.user?.user_metadata?.display_name ?? '').trim();
      setDisplayName(fallbackName);
    };

    void loadProfile();
  }, [session?.user?.id, session?.user?.user_metadata]);

  const stats = useMemo(() => {
    const dishesThisWeek = planItems.reduce((acc, item) => acc + Math.max(1, item.days.length), 0);
    const uniqueDays = new Set(planItems.flatMap((item) => item.days)).size;
    const calories = Math.round(
      planItems.reduce((acc, item) => {
        const perServing = estimateRecipeCalories(item.recipe?.ingredients ?? []);
        const occurrences = Math.max(1, item.days.length);
        return acc + perServing * Math.max(1, item.servings) * occurrences;
      }, 0)
    );

    return {
      dishesThisWeek,
      uniqueDays,
      calories,
    };
  }, [planItems]);

  const emptyState = !planItems.length && !favorites.length;

  const settingsItems: SettingsListItem[] = [
    {
      key: 'invitations',
      icon: 'mail-outline',
      title: 'Invitaciones',
      onPress: () => showToast({ type: 'info', message: 'Gestioná invitaciones desde tu chef' }),
    },
    {
      key: 'notifications',
      icon: 'notifications-outline',
      title: 'Notificaciones',
      onPress: () => showToast({ type: 'info', message: 'Próximamente vas a poder personalizarlas' }),
    },
    {
      key: 'theme',
      icon: 'color-palette-outline',
      title: 'Tema (Light/Dark)',
      onPress: () => showToast({ type: 'info', message: 'La app usa tema automático del sistema' }),
    },
    {
      key: 'account',
      icon: 'person-outline',
      title: 'Cuenta',
      onPress: () =>
        showToast({
          type: 'info',
          message: displayName.trim() ? `Sesión activa como ${displayName}` : 'Sesión activa',
        }),
    },
  ];

  const onRepeatWeek = async () => {
    await Haptics.selectionAsync();
    router.push('/(consumer)/week');
    showToast({ type: 'info', message: 'Desde Mi semana podés repetir la anterior en un toque' });
  };

  const onUnlink = () => {
    Alert.alert('Desvincular chef', '¿Querés desvincularte de tu chef actual?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desvincular',
        style: 'destructive',
        onPress: async () => {
          const userId = session?.user?.id;
          if (!userId) return;
          await supabase.from('chef_consumers').delete().eq('consumer_id', userId);
          clearConsumerStore();
          showToast({ type: 'success', message: 'Te desvinculaste correctamente' });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <Animated.View style={{ flex: 1, opacity: enterAnim, transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingBottom: spacing.xl + spacing.xl,
          }}
        >
          <ProfileHeader name={displayName || 'Consumidor'} email={session?.user?.email ?? 'sin-email'} />

          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.subtitle, { color: colors.label }]}>Resumen semanal</Text>
            <View style={[styles.grid, { marginTop: spacing.md, gap: spacing.sm }]}>
              <View style={styles.half}>
                <StatCard title="Platos esta semana" value={String(stats.dishesThisWeek)} subtitle="eventos planificados" />
              </View>
              <View style={styles.half}>
                <StatCard title="Calorías totales" value={stats.calories ? `${stats.calories}` : '0'} subtitle="aproximadas" />
              </View>
              <View style={styles.half}>
                <StatCard title="Días planificados" value={String(stats.uniqueDays)} subtitle="sobre 7 días" />
              </View>
              <View style={styles.half}>
                <StatCard
                  title="Favoritos"
                  value={String(favorites.length)}
                  subtitle={favorites.length ? 'guardados' : 'sin favoritos'}
                />
              </View>
            </View>
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.subtitle, { color: colors.label }]}>Acciones principales</Text>
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <ActionItem icon="heart-outline" title="Favoritos" onPress={() => router.push('/(consumer)/menu')} />
              <ActionItem icon="calendar-outline" title="Mi semana" onPress={() => router.push('/(consumer)/week')} />
              <ActionItem icon="repeat-outline" title="Repetir semana" onPress={() => void onRepeatWeek()} />
            </View>
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.subtitle, { color: colors.label }]}>Configuración</Text>
            <View style={{ marginTop: spacing.md }}>
              <SettingsList items={settingsItems} />
            </View>
          </View>

          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            {chefId ? (
              <Pressable
                onPress={onUnlink}
                style={({ pressed }) => [
                  styles.logoutButton,
                  {
                    backgroundColor: colors.card,
                    borderRadius: radius.large,
                    borderColor: colors.separator,
                    minHeight: spacing.xl + spacing.md,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
              >
                <Text style={[styles.logoutText, { color: colors.warning }]}>Desvincular de mi chef</Text>
                <Text style={[styles.logoutMeta, { color: colors.tertiaryLabel }]}>
                  {linkedAt ? `Vinculado desde ${new Date(linkedAt).toLocaleDateString('es-UY')}` : 'Sin fecha de vínculo'}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => void signOut()}
              style={({ pressed }) => [
                styles.logoutButton,
                {
                  backgroundColor: colors.card,
                  borderRadius: radius.large,
                  borderColor: colors.separator,
                  minHeight: spacing.xl + spacing.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              <Text style={[styles.logoutText, { color: colors.danger }]}>Cerrar sesión</Text>
            </Pressable>
          </View>

          {emptyState ? (
            <View
              style={[
                styles.emptyBox,
                {
                  marginTop: spacing.lg,
                  backgroundColor: colors.card,
                  borderRadius: radius.large,
                  borderColor: colors.separator,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: colors.label }]}>Todavía no hay actividad</Text>
              <Text style={[styles.emptySubtitle, { color: colors.secondaryLabel }]}>
                Cuando planifiques comidas o guardes favoritos, vas a ver todo resumido acá.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  half: {
    width: '48%',
  },
  logoutButton: {
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  logoutMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  emptyBox: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});
