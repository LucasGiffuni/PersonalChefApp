import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  PlatformColor,
  Pressable,
  RefreshControl,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { PlanItemWithRecipe, useConsumerStore } from '../../lib/stores/consumerStore';

const Swipeable = Platform.OS === 'web' ? null : (require('react-native-gesture-handler').Swipeable as any);

function iosColor(name: string, fallback: string) {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

const dayMap = [
  { key: 'mon', long: 'Lunes', short: 'Lun' },
  { key: 'tue', long: 'Martes', short: 'Mar' },
  { key: 'wed', long: 'Miércoles', short: 'Mié' },
  { key: 'thu', long: 'Jueves', short: 'Jue' },
  { key: 'fri', long: 'Viernes', short: 'Vie' },
  { key: 'sat', long: 'Sábado', short: 'Sáb' },
  { key: 'sun', long: 'Domingo', short: 'Dom' },
];

type DaySection = {
  title: string;
  date: Date;
  data: PlanItemWithRecipe[];
  dayKey: string;
};

export default function ConsumerWeekScreen() {
  const isDark = useColorScheme() === 'dark';
  const selectedWeekStart = useConsumerStore((s) => s.selectedWeekStart);
  const planItems = useConsumerStore((s) => s.planItems);
  const currentPlan = useConsumerStore((s) => s.currentPlan);
  const navigateWeek = useConsumerStore((s) => s.navigateWeek);
  const fetchPlanItems = useConsumerStore((s) => s.fetchPlanItems);
  const upsertPlanItem = useConsumerStore((s) => s.upsertPlanItem);
  const removePlanItem = useConsumerStore((s) => s.removePlanItem);

  const [refreshing, setRefreshing] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;

  const sections = useMemo<DaySection[]>(() => {
    return dayMap.map((day, index) => {
      const date = new Date(selectedWeekStart);
      date.setDate(selectedWeekStart.getDate() + index);
      const data = planItems.filter((item) => item.days.includes(day.key));
      return {
        title: `${day.long} ${date.getDate()}`,
        date,
        data,
        dayKey: day.key,
      };
    });
  }, [planItems, selectedWeekStart]);

  const weekTitle = useMemo(() => {
    const start = new Date(selectedWeekStart);
    const end = new Date(selectedWeekStart);
    end.setDate(start.getDate() + 6);
    const month = start.toLocaleDateString('es-UY', { month: 'short' });
    return `Lun ${start.getDate()} – Dom ${end.getDate()} ${month}`;
  }, [selectedWeekStart]);

  const onChangeWeek = async (direction: 'prev' | 'next') => {
    Animated.timing(slide, {
      toValue: direction === 'next' ? -16 : 16,
      duration: 180,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start(async () => {
      slide.setValue(0);
      await navigateWeek(direction);
    });
  };

  const onRefresh = async () => {
    if (!currentPlan?.id) return;
    setRefreshing(true);
    await fetchPlanItems(currentPlan.id);
    setRefreshing(false);
  };

  const mealsCount = planItems.reduce((acc, item) => acc + item.days.length, 0);
  const distinctRecipes = planItems.length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: iosColor('systemGroupedBackground', isDark ? '#000' : '#F2F2F7') }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.chevronButton}
          onPress={() => void onChangeWeek('prev')}
        >
          <Text style={[styles.chevron, { color: iosColor('systemBlue', '#007AFF') }]}>‹</Text>
        </Pressable>
        <Animated.Text style={[styles.weekTitle, { color: iosColor('label', isDark ? '#FFF' : '#000'), transform: [{ translateX: slide }] }]}>
          {weekTitle}
        </Animated.Text>
        <Pressable
          style={styles.chevronButton}
          onPress={() => void onChangeWeek('next')}
        >
          <Text style={[styles.chevron, { color: iosColor('systemBlue', '#007AFF') }]}>›</Text>
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionHeader, { color: iosColor('secondaryLabel', '#8E8E93') }]}>{section.title.toUpperCase()}</Text>
        )}
        renderItem={({ item, section }) => {
          const recipeName = item.recipe?.name || 'Receta';
          const emoji = item.recipe?.emoji || '🍽️';

          const row = (
            <View
              style={[
                styles.row,
                {
                  borderBottomColor: iosColor('separator', isDark ? '#3A3A3C' : '#C6C6C8'),
                  backgroundColor: iosColor('secondarySystemGroupedBackground', isDark ? '#1C1C1E' : '#FFFFFF'),
                },
              ]}
            >
              <Text style={styles.rowEmoji}>{emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>{recipeName}</Text>
                <Text style={[styles.rowSubtitle, { color: iosColor('secondaryLabel', '#8E8E93') }]}>{item.servings} porciones</Text>
              </View>
              {!Swipeable ? (
                <Pressable
                  onPress={async () => {
                    const nextDays = item.days.filter((d) => d !== section.dayKey);
                    if (nextDays.length) {
                      await upsertPlanItem(item.recipe_id, item.servings, nextDays);
                    } else {
                      await removePlanItem(item.id);
                    }
                    await Haptics.selectionAsync();
                  }}
                  style={[styles.webRemove, { backgroundColor: iosColor('systemRed', '#FF3B30') }]}
                >
                  <Text style={styles.webRemoveText}>Quitar</Text>
                </Pressable>
              ) : null}
            </View>
          );

          if (!Swipeable) return row;

          return (
            <Swipeable
              renderRightActions={() => (
                <View style={[styles.swipeAction, { backgroundColor: iosColor('systemRed', '#FF3B30') }]}>
                  <Text style={styles.swipeActionText}>Quitar</Text>
                </View>
              )}
              onSwipeableOpen={async () => {
                const nextDays = item.days.filter((d) => d !== section.dayKey);
                if (nextDays.length) {
                  await upsertPlanItem(item.recipe_id, item.servings, nextDays);
                } else {
                  await removePlanItem(item.id);
                }
                await Haptics.selectionAsync();
              }}
            >
              {row}
            </Swipeable>
          );
        }}
        renderSectionFooter={({ section }) =>
          section.data.length ? null : (
            <View
              style={[
                styles.row,
                {
                  borderBottomColor: iosColor('separator', isDark ? '#3A3A3C' : '#C6C6C8'),
                  backgroundColor: iosColor('secondarySystemGroupedBackground', isDark ? '#1C1C1E' : '#FFFFFF'),
                },
              ]}
            >
              <Text style={[styles.emptyRowText, { color: iosColor('secondaryLabel', '#8E8E93') }]}>Sin comidas planificadas</Text>
            </View>
          )
        }
      />

      <View style={styles.footerWrap}>
        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={styles.footerBlur}>
          <Text style={[styles.footerText, { color: iosColor('label', isDark ? '#FFF' : '#000') }]}>
            {mealsCount} comidas · {distinctRecipes} recetas distintas
          </Text>
        </BlurView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  chevronButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  chevron: { fontSize: 32, lineHeight: 32, fontWeight: '500' },
  weekTitle: { fontSize: 17, fontWeight: '600' },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 6,
  },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowEmoji: { fontSize: 24, marginRight: 10 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSubtitle: { fontSize: 13, marginTop: 2 },
  emptyRowText: { fontSize: 15, fontStyle: 'italic' },
  swipeAction: { width: 90, alignItems: 'center', justifyContent: 'center' },
  swipeActionText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  webRemove: { minHeight: 30, borderRadius: 8, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  webRemoveText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  footerWrap: { position: 'absolute', left: 12, right: 12, bottom: 76, borderRadius: 14, overflow: 'hidden' },
  footerBlur: { minHeight: 46, justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, fontWeight: '600' },
});
