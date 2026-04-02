import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  PlatformColor,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useChefDashboardStore } from '../../../lib/stores/chefDashboardStore';
import { lightTheme, useTheme } from '../../../lib/theme';

function iosColor(name: string, fallback: string) {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

export default function ChefWeeklyProductionScreen() {
  const { colors } = useTheme();

  const selectedWeekStart = useChefDashboardStore((s) => s.selectedWeekStart);
  const weekOrders = useChefDashboardStore((s) => s.weekOrders);
  const fetchConsumers = useChefDashboardStore((s) => s.fetchConsumers);
  const fetchWeekOrders = useChefDashboardStore((s) => s.fetchWeekOrders);
  const navigateWeek = useChefDashboardStore((s) => s.navigateWeek);
  const computeAggregate = useChefDashboardStore((s) => s.computeAggregate);

  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        try {
          setIsLoading(true);
          setError(null);
          await fetchConsumers();
          await fetchWeekOrders(selectedWeekStart);
        } catch {
          setError('No se pudo cargar la producción semanal.');
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

  const productionList = useMemo(
    () => [...computeAggregate(weekOrders)].sort((a, b) => b.totalServings - a.totalServings),
    [computeAggregate, weekOrders]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setError(null);
      await fetchConsumers();
      await fetchWeekOrders(selectedWeekStart);
    } catch {
      setError('No se pudo actualizar la producción.');
    }
    setRefreshing(false);
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

      <FlatList
        data={productionList}
        keyExtractor={(item, index) => String(item.recipe?.id ?? index)}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        ListHeaderComponent={<Text style={[styles.title, { color: iosColor('label', colors.label) }]}>Producción semanal</Text>}
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: iosColor('secondarySystemGroupedBackground', colors.card) }]}>
            <Text style={[styles.productionLine, { color: iosColor('label', colors.label) }]} numberOfLines={1}>
              {`${item.recipe?.name || 'Receta'} \u2192 ${item.totalServings} porciones`}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: iosColor('label', colors.label) }]}>
              {isLoading ? 'Cargando producción…' : error ? 'Error de carga' : 'Sin producción para esta semana'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>
              {error ? error : 'Cuando haya pedidos, verás aquí cuánto cocinar de cada plato.'}
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
  title: { fontSize: 34, lineHeight: 40, fontWeight: '800', marginBottom: 12, letterSpacing: -0.6 },
  row: {
    minHeight: 62,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: lightTheme.colors.label,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 3,
  },
  productionLine: { flex: 1, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  emptyWrap: { paddingTop: 44, alignItems: 'center', paddingHorizontal: 18 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { marginTop: 8, fontSize: 14, textAlign: 'center' },
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
