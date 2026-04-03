import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../lib/stores/authStore';
import { useChefDashboardStore } from '../../lib/stores/chefDashboardStore';
import { useTheme } from '../../lib/theme';
import { showToast } from '../../lib/utils/toast';
import { ActionItem, ProfileHeader, SettingsList, type SettingsListItem, StatCard } from '../../lib/ui/profile';

type IngredientLike = {
  grams?: unknown;
  pricePer100g?: unknown;
  price_per_100g?: unknown;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function estimateRecipeCost(ingredients: unknown) {
  if (!Array.isArray(ingredients)) return 0;
  return (ingredients as IngredientLike[]).reduce((total, ingredient) => {
    const grams = toNumber(ingredient.grams);
    const pricePer100g = toNumber(ingredient.pricePer100g ?? ingredient.price_per_100g);
    return total + (grams / 100) * pricePer100g;
  }, 0);
}

export default function ChefProfileScreen() {
  const router = useRouter();
  const { colors, spacing, radius, typography } = useTheme();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);

  const consumers = useChefDashboardStore((s) => s.consumers);
  const weekOrders = useChefDashboardStore((s) => s.weekOrders);
  const selectedWeekStart = useChefDashboardStore((s) => s.selectedWeekStart);
  const fetchConsumers = useChefDashboardStore((s) => s.fetchConsumers);
  const fetchWeekOrders = useChefDashboardStore((s) => s.fetchWeekOrders);

  const enterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [enterAnim]);

  useEffect(() => {
    const load = async () => {
      await fetchConsumers();
      await fetchWeekOrders(selectedWeekStart);
    };
    void load();
  }, [fetchConsumers, fetchWeekOrders, selectedWeekStart]);

  const stats = useMemo(() => {
    const activeOrders = weekOrders.filter((group) => group.items.length > 0).length;
    const soldDishes = weekOrders.reduce(
      (total, group) =>
        total +
        group.items.reduce((acc, item) => acc + Math.max(1, item.servings) * Math.max(1, item.days.length), 0),
      0
    );

    const estimatedRevenue = Math.round(
      weekOrders.reduce((total, group) => {
        return (
          total +
          group.items.reduce((acc, item) => {
            const baseCost = estimateRecipeCost(item.recipe?.ingredients ?? []);
            const suggestedPrice = baseCost > 0 ? baseCost * 2.2 : 250;
            return acc + suggestedPrice * Math.max(1, item.servings) * Math.max(1, item.days.length);
          }, 0)
        );
      }, 0)
    );

    return {
      activeOrders,
      soldDishes,
      estimatedRevenue,
      consumers: consumers.length,
    };
  }, [consumers.length, weekOrders]);

  const emptyState = !weekOrders.length;
  const displayName = String(session?.user?.user_metadata?.display_name ?? '').trim() || 'Chef';

  const settingsItems: SettingsListItem[] = [
    {
      key: 'invitations',
      icon: 'mail-outline',
      title: 'Invitaciones',
      onPress: () => router.push('/(chef)/invite'),
    },
    {
      key: 'notifications',
      icon: 'notifications-outline',
      title: 'Notificaciones',
      onPress: () => showToast({ type: 'info', message: 'Las notificaciones ya están activas en tiempo real' }),
    },
    {
      key: 'theme',
      icon: 'color-palette-outline',
      title: 'Tema (Light/Dark)',
      onPress: () => showToast({ type: 'info', message: 'La app usa el tema del sistema' }),
    },
    {
      key: 'account',
      icon: 'person-outline',
      title: 'Cuenta',
      onPress: () => showToast({ type: 'info', message: session?.user?.email ?? 'Sin email' }),
    },
  ];

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
          <ProfileHeader name={displayName} email={session?.user?.email ?? 'sin-email'} />

          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.subtitle, { color: colors.label }]}>Resumen del negocio</Text>
            <View style={[styles.grid, { marginTop: spacing.md, gap: spacing.sm }]}>
              <View style={styles.half}>
                <StatCard title="Pedidos activos" value={String(stats.activeOrders)} subtitle="clientes con pedidos" />
              </View>
              <View style={styles.half}>
                <StatCard title="Platos vendidos" value={String(stats.soldDishes)} subtitle="porciones totales" />
              </View>
              <View style={styles.half}>
                <StatCard title="Ingresos estimados" value={`$${stats.estimatedRevenue}`} subtitle="estimación semanal" />
              </View>
              <View style={styles.half}>
                <StatCard title="Consumidores" value={String(stats.consumers)} subtitle="bajo tu tutela" />
              </View>
            </View>
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.subtitle, { color: colors.label }]}>Acciones principales</Text>
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <ActionItem icon="bar-chart-outline" title="Ver pedidos" onPress={() => router.push('/(chef)/calendar/orders')} />
              <ActionItem icon="restaurant-outline" title="Mis recetas" onPress={() => router.push('/(chef)/recipes')} />
              <ActionItem icon="flame-outline" title="Producción" onPress={() => router.push('/(chef)/calendar/production')} />
            </View>
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.subtitle, { color: colors.label }]}>Configuración</Text>
            <View style={{ marginTop: spacing.md }}>
              <SettingsList items={settingsItems} />
            </View>
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Pressable
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                await signOut();
              }}
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
              <Text style={[styles.emptyTitle, { color: colors.label }]}>Todavía no hay pedidos esta semana</Text>
              <Text style={[styles.emptySubtitle, { color: colors.secondaryLabel }]}>
                Compartí invitaciones y vas a ver tus métricas de ventas y producción acá.
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
