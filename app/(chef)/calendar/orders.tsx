import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  PlatformColor,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useChefDashboardStore } from '../../../lib/stores/chefDashboardStore';

function iosColor(name: string, fallback: string) {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

const dayLabels: Record<string, string> = {
  mon: 'L',
  tue: 'M',
  wed: 'X',
  thu: 'J',
  fri: 'V',
  sat: 'S',
  sun: 'D',
};

export default function ChefWeeklyOrdersScreen() {
  const isDark = false;
  const consumers = useChefDashboardStore((s) => s.consumers);
  const weekOrders = useChefDashboardStore((s) => s.weekOrders);
  const selectedWeekStart = useChefDashboardStore((s) => s.selectedWeekStart);
  const fetchConsumers = useChefDashboardStore((s) => s.fetchConsumers);
  const fetchWeekOrders = useChefDashboardStore((s) => s.fetchWeekOrders);
  const navigateWeek = useChefDashboardStore((s) => s.navigateWeek);
  const computeAggregate = useChefDashboardStore((s) => s.computeAggregate);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        await fetchConsumers();
        await fetchWeekOrders(selectedWeekStart);
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

  const aggregate = computeAggregate(weekOrders);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConsumers();
    await fetchWeekOrders(selectedWeekStart);
    setRefreshing(false);
  };

  const onShare = async () => {
    const lines: string[] = [];
    lines.push(`Resumen semanal (${weekTitle})`);
    lines.push('');
    aggregate.forEach((entry) => {
      const recipeName = entry.recipe?.name ?? 'Receta';
      const consumersUsing = weekOrders
        .filter((group) => group.items.some((item) => item.recipe_id === entry.recipe?.id))
        .map((group) => group.consumer.displayName)
        .join(', ');
      lines.push(`• ${recipeName}: ${entry.totalServings} porciones (${entry.consumerCount} consumidores)`);
      if (consumersUsing) {
        lines.push(`  ${consumersUsing}`);
      }
    });

    await Share.share({ message: lines.join('\n') });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: iosColor('systemGroupedBackground', isDark ? '#000' : '#F2F2F7') }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => void navigateWeek('prev')} style={styles.chevronButton}>
            <Text style={[styles.chevronText, { color: iosColor('systemBlue', '#007AFF') }]}>‹</Text>
          </Pressable>
          <Text style={[styles.weekTitle, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>{weekTitle}</Text>
          <Pressable onPress={() => void navigateWeek('next')} style={styles.chevronButton}>
            <Text style={[styles.chevronText, { color: iosColor('systemBlue', '#007AFF') }]}>›</Text>
          </Pressable>
        </View>

        <Pressable style={styles.shareButton} onPress={() => void onShare()}>
          <Ionicons name="share-outline" size={16} color={iosColor('systemBlue', '#007AFF')} />
          <Text style={[styles.shareText, { color: iosColor('systemBlue', '#007AFF') }]}>Compartir resumen</Text>
        </Pressable>

        {weekOrders.map((group) => {
          const totalServings = group.items.reduce((sum, item) => sum + item.servings * Math.max(1, item.days.length), 0);
          const isExpanded = !!expanded[group.consumer.consumerId];

          return (
            <View key={group.consumer.consumerId} style={[styles.card, { backgroundColor: iosColor('secondarySystemGroupedBackground', '#FFF') }]}>
              <Pressable
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setExpanded((prev) => ({ ...prev, [group.consumer.consumerId]: !isExpanded }));
                }}
                style={styles.cardHeader}
              >
                <View style={[styles.avatar, { backgroundColor: 'rgba(0,122,255,0.15)' }]}>
                  <Text style={{ color: iosColor('systemBlue', '#007AFF'), fontWeight: '700' }}>
                    {group.consumer.displayName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.consumerName, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>{group.consumer.displayName}</Text>
                  <Text style={[styles.consumerMeta, { color: iosColor('secondaryLabel', '#8E8E93') }]}>
                    {group.items.length} recetas · {totalServings} porciones total
                  </Text>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={iosColor('tertiaryLabel', '#8E8E93')}
                />
              </Pressable>

              {isExpanded ? (
                <View style={styles.cardBody}>
                  {group.items.map((item) => (
                    <View key={item.id} style={styles.recipeRow}>
                      <Text style={styles.recipeEmoji}>{item.recipe?.emoji || '🍽️'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.recipeName, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>
                          {item.recipe?.name || 'Receta'}
                        </Text>
                        <Text style={[styles.recipeMeta, { color: iosColor('secondaryLabel', '#8E8E93') }]}>
                          {item.days.map((d) => dayLabels[d] || d).join(', ')} · {item.servings} porciones
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}

        <Text style={[styles.summaryTitle, { color: iosColor('secondaryLabel', '#8E8E93') }]}>RESUMEN TOTAL</Text>
        <View style={[styles.summaryCard, { backgroundColor: iosColor('secondarySystemGroupedBackground', '#FFF') }]}>
          {aggregate.map((entry) => (
            <View key={entry.recipe?.id} style={[styles.summaryRow, { borderBottomColor: iosColor('separator', '#C6C6C8') }]}>
              <Text style={styles.recipeEmoji}>{entry.recipe?.emoji || '🍽️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.recipeName, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>{entry.recipe?.name}</Text>
                <Text style={[styles.recipeMeta, { color: iosColor('secondaryLabel', '#8E8E93') }]}>
                  {entry.totalServings} porciones en total · {entry.consumerCount} consumidores
                </Text>
              </View>
            </View>
          ))}
          {!aggregate.length ? (
            <View style={styles.summaryRow}>
              <Text style={[styles.recipeMeta, { color: iosColor('secondaryLabel', '#8E8E93') }]}>
                No hay pedidos para esta semana.
              </Text>
            </View>
          ) : null}
        </View>

        {!consumers.length ? (
          <Text style={[styles.emptyInfo, { color: iosColor('secondaryLabel', '#8E8E93') }]}>
            Todavía no tenés consumidores vinculados.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  headerRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chevronButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  chevronText: { fontSize: 30, lineHeight: 30, fontWeight: '500' },
  weekTitle: { fontSize: 17, fontWeight: '600' },
  shareButton: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  shareText: { marginLeft: 6, fontSize: 15, fontWeight: '600' },
  card: { borderRadius: 14, marginBottom: 10, overflow: 'hidden' },
  cardHeader: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  consumerName: { fontSize: 16, fontWeight: '600' },
  consumerMeta: { marginTop: 2, fontSize: 13 },
  cardBody: { paddingHorizontal: 12, paddingBottom: 12 },
  recipeRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center' },
  recipeEmoji: { fontSize: 22, marginRight: 9 },
  recipeName: { fontSize: 15, fontWeight: '600' },
  recipeMeta: { marginTop: 2, fontSize: 12 },
  summaryTitle: { fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 6, paddingHorizontal: 4 },
  summaryCard: { borderRadius: 12, overflow: 'hidden' },
  summaryRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emptyInfo: { marginTop: 14, fontSize: 14 },
});
