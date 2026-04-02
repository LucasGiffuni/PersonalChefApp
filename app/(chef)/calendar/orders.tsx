import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  PlatformColor,
  Pressable,
  RefreshControl,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { useChefDashboardStore } from '../../../lib/stores/chefDashboardStore';
import { lightTheme, useTheme } from '../../../lib/theme';

function iosColor(name: string, fallback: string) {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

type DishEntry = {
  id: string;
  recipeName: string;
  servings: number;
};

type DayGroup = {
  key: DayKey;
  label: string;
  dishes: DishEntry[];
};

type CustomerSection = {
  key: string;
  title: string;
  initials: string;
  totalPlates: number;
  totalServings: number;
  days: DayGroup[];
  data: Array<{ type: 'customer-body' }>;
};

const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo',
};

function toInitials(name: string) {
  const safe = name.trim();
  if (!safe) return 'CL';
  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export default function ChefWeeklyOrdersScreen() {
  const { colors } = useTheme();

  const consumers = useChefDashboardStore((s) => s.consumers);
  const weekOrders = useChefDashboardStore((s) => s.weekOrders);
  const selectedWeekStart = useChefDashboardStore((s) => s.selectedWeekStart);
  const fetchConsumers = useChefDashboardStore((s) => s.fetchConsumers);
  const fetchWeekOrders = useChefDashboardStore((s) => s.fetchWeekOrders);
  const navigateWeek = useChefDashboardStore((s) => s.navigateWeek);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        try {
          setIsLoading(true);
          setError(null);
          await fetchConsumers();
          await fetchWeekOrders(selectedWeekStart);
        } catch {
          setError('No se pudieron cargar los pedidos de la semana.');
        } finally {
          setIsLoading(false);
        }
      };
      void run();
    }, [fetchConsumers, fetchWeekOrders, selectedWeekStart])
  );

  const weekTitle = useMemo(() => {
    const start = new Date(selectedWeekStart);
    const end = new Date(selectedWeekStart);
    end.setDate(start.getDate() + 6);
    const month = start.toLocaleDateString('es-UY', { month: 'short' });
    return `Lun ${start.getDate()} – Dom ${end.getDate()} ${month}`;
  }, [selectedWeekStart]);

  const sections = useMemo<CustomerSection[]>(() => {
    const groupByConsumer = new Map(weekOrders.map((group) => [group.consumer.consumerId, group]));

    return consumers
      .map((consumer) => {
        const group = groupByConsumer.get(consumer.consumerId);
        const dayMap = new Map<DayKey, DishEntry[]>();

        if (group) {
          group.items.forEach((item) => {
            const recipeName = item.recipe?.name || 'Receta';
            item.days.forEach((day) => {
              if (!DAY_ORDER.includes(day as DayKey)) return;
              const key = day as DayKey;
              const current = dayMap.get(key) ?? [];
              current.push({
                id: `${item.id}-${key}`,
                recipeName,
                servings: Math.max(1, item.servings || 1),
              });
              dayMap.set(key, current);
            });
          });
        }

        const days = DAY_ORDER
          .map((day): DayGroup | null => {
            const dishes = dayMap.get(day) ?? [];
            if (!dishes.length) return null;
            return {
              key: day,
              label: DAY_LABELS[day],
              dishes,
            };
          })
          .filter(Boolean) as DayGroup[];

        const totalPlates = days.reduce((acc, day) => acc + day.dishes.length, 0);
        const totalServings = days.reduce(
          (acc, day) => acc + day.dishes.reduce((inner, dish) => inner + dish.servings, 0),
          0
        );

        return {
          key: consumer.consumerId,
          title: consumer.displayName.trim() || 'Cliente',
          initials: toInitials(consumer.displayName || ''),
          totalPlates,
          totalServings,
          days,
          data: [{ type: 'customer-body' as const }],
        };
      })
      .sort((a, b) => b.totalServings - a.totalServings);
  }, [consumers, weekOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setError(null);
      await fetchConsumers();
      await fetchWeekOrders(selectedWeekStart);
    } catch {
      setError('No se pudieron actualizar los pedidos.');
    }
    setRefreshing(false);
  };

  const toggleCustomer = async (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    await Haptics.selectionAsync();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: iosColor('systemGroupedBackground', colors.background) }]}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={async () => {
            await Haptics.selectionAsync();
            await navigateWeek('prev');
          }}
          style={styles.chevronButton}
        >
          <Text style={[styles.chevronText, { color: iosColor('systemBlue', colors.primary) }]}>‹</Text>
        </Pressable>
        <Text style={[styles.weekTitle, { color: iosColor('label', colors.label) }]}>{weekTitle}</Text>
        <Pressable
          onPress={async () => {
            await Haptics.selectionAsync();
            await navigateWeek('next');
          }}
          style={styles.chevronButton}
        >
          <Text style={[styles.chevronText, { color: iosColor('systemBlue', colors.primary) }]}>›</Text>
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${index}-${item.type}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[styles.screenTitle, { color: iosColor('label', colors.label) }]}>Pedidos por cliente</Text>
            <Text style={[styles.screenSubtitle, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>
              Semana {weekTitle}
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => {
          const isExpanded = expanded[section.key] ?? true;

          return (
            <View
              style={[
                styles.customerCard,
                {
                  backgroundColor: iosColor('secondarySystemGroupedBackground', colors.card),
                },
              ]}
            >
              <Pressable style={styles.customerHeader} onPress={() => toggleCustomer(section.key)}>
                <View style={[styles.avatar, { backgroundColor: iosColor('tertiarySystemFill', colors.fill) }]}>
                  <Text style={[styles.avatarText, { color: iosColor('systemBlue', colors.primary) }]}>
                    {section.initials}
                  </Text>
                </View>

                <View style={styles.customerInfo}>
                  <Text style={[styles.customerName, { color: iosColor('label', colors.label) }]}>{section.title}</Text>
                  <Text style={[styles.customerTotals, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>
                    {section.totalPlates} plato{section.totalPlates !== 1 ? 's' : ''} · {section.totalServings} porciones
                  </Text>
                </View>

                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={iosColor('tertiaryLabel', colors.tertiaryLabel)}
                />
              </Pressable>
            </View>
          );
        }}
        renderItem={({ section }) => {
          const isExpanded = expanded[section.key] ?? true;

          if (!isExpanded) return null;

          if (!section.days.length) {
            return (
              <View style={[styles.customerBody, styles.noOrdersRow]}>
                <Text style={[styles.noOrdersText, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>Sin pedidos para esta semana</Text>
              </View>
            );
          }

          return (
            <View style={styles.customerBody}>
              {section.days.map((day, dayIndex) => (
                <View key={`${section.key}-${day.key}`} style={[styles.dayGroup, dayIndex > 0 && styles.dayGroupBorder]}>
                  <Text style={[styles.dayTitle, { color: iosColor('label', colors.label) }]}>{day.label}</Text>

                  {day.dishes.map((dish, dishIndex) => (
                    <View key={dish.id} style={[styles.dishRow, dishIndex > 0 && styles.dishRowGap]}>
                      <Text style={[styles.dishBullet, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>•</Text>
                      <Text style={[styles.dishText, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>
                        {dish.recipeName} — {dish.servings} porciones
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: iosColor('label', colors.label) }]}>
              {isLoading ? 'Cargando pedidos…' : error ? 'Error al cargar pedidos' : 'No hay pedidos esta semana'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>
              {error ? error : 'Cuando tus clientes planifiquen comidas, aparecerán aquí.'}
            </Text>
            {error ? (
              <Pressable style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => void onRefresh()}>
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  chevronButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  chevronText: { fontSize: 30, lineHeight: 30, fontWeight: '500' },
  weekTitle: { fontSize: 17, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 8 },
  listHeader: {
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },

  customerCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: lightTheme.colors.label,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  customerHeader: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
  },
  customerTotals: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },

  customerBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  dayGroup: {
    paddingTop: 8,
  },
  dayGroupBorder: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: lightTheme.colors.separator,
  },
  dayTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  dishRow: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dishRowGap: {
    marginTop: 2,
  },
  dishBullet: {
    marginRight: 8,
    fontSize: 18,
    lineHeight: 18,
  },
  dishText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },

  noOrdersRow: {
    paddingTop: 2,
  },
  noOrdersText: {
    fontSize: 14,
    fontStyle: 'italic',
  },

  emptyWrap: {
    paddingTop: 56,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    minHeight: 38,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: lightTheme.colors.card,
    fontSize: 14,
    fontWeight: '700',
  },
});
