import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlanItemWithRecipe, useConsumerStore } from '../../lib/stores/consumerStore';
import { lightTheme, useTheme } from '../../lib/theme';
import { showToast } from '../../lib/utils/toast';
import { DaySelector } from './menu/components/DaySelector';
import { QuantitySelector } from './menu/components/QuantitySelector';

const Swipeable = Platform.OS === 'web' ? null : (require('react-native-gesture-handler').Swipeable as any);

function iosColor(name: string, fallback: string) {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

const dayMap = [
  { key: 'mon', long: 'Lunes' },
  { key: 'tue', long: 'Martes' },
  { key: 'wed', long: 'Miércoles' },
  { key: 'thu', long: 'Jueves' },
  { key: 'fri', long: 'Viernes' },
  { key: 'sat', long: 'Sábado' },
  { key: 'sun', long: 'Domingo' },
];

type DaySection = {
  title: string;
  date: Date;
  data: PlanItemWithRecipe[];
  dayKey: string;
};

const TOP_BAR_HEIGHT = 56;

export default function ConsumerWeekScreen() {
  const isDark = useColorScheme() === 'dark';
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const selectedWeekStart = useConsumerStore((s) => s.selectedWeekStart);
  const planItems = useConsumerStore((s) => s.planItems);
  const currentPlan = useConsumerStore((s) => s.currentPlan);
  const navigateWeek = useConsumerStore((s) => s.navigateWeek);
  const fetchPlanItems = useConsumerStore((s) => s.fetchPlanItems);
  const upsertPlanItem = useConsumerStore((s) => s.upsertPlanItem);
  const removePlanItem = useConsumerStore((s) => s.removePlanItem);

  const [refreshing, setRefreshing] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanItemWithRecipe | null>(null);
  const [editingServings, setEditingServings] = useState(1);
  const [editingDays, setEditingDays] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingEdit, setDeletingEdit] = useState(false);
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
      toValue: direction === 'next' ? -18 : 18,
      duration: 220,
      easing: Easing.bezier(0.2, 0.9, 0.2, 1),
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

  const openEditor = async (item: PlanItemWithRecipe) => {
    setEditingItem(item);
    setEditingServings(Math.max(1, item.servings || 1));
    setEditingDays(Array.isArray(item.days) ? item.days : []);
    await Haptics.selectionAsync();
  };

  const closeEditor = () => {
    setEditingItem(null);
    setEditingServings(1);
    setEditingDays([]);
    setSavingEdit(false);
    setDeletingEdit(false);
  };

  const toggleEditDay = async (day: string) => {
    setEditingDays((prev) => (prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]));
    await Haptics.selectionAsync();
  };

  const onSaveEdit = async () => {
    if (!editingItem) return;
    if (editingServings <= 0) {
      showToast({ type: 'error', message: 'La cantidad debe ser mayor a 0' });
      return;
    }
    if (!editingDays.length) {
      showToast({ type: 'error', message: 'Elegí al menos un día' });
      return;
    }

    try {
      setSavingEdit(true);
      await upsertPlanItem(editingItem.recipe_id, editingServings, editingDays);
      showToast({ type: 'success', message: 'Cambios guardados' });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeEditor();
    } catch {
      showToast({ type: 'error', message: 'No se pudieron guardar cambios' });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSavingEdit(false);
    }
  };

  const onDeleteEdit = async () => {
    if (!editingItem) return;

    try {
      setDeletingEdit(true);
      await removePlanItem(editingItem.id);
      showToast({ type: 'success', message: 'Eliminado del plan' });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeEditor();
    } catch {
      showToast({ type: 'error', message: 'No se pudo eliminar del plan' });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setDeletingEdit(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: iosColor('systemGroupedBackground', colors.background) }]}>
      <View style={[styles.topHeaderWrap, { paddingTop: insets.top }]}> 
        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={styles.topHeaderBlur}>
          <Pressable style={styles.chevronButton} onPress={() => void onChangeWeek('prev')}>
            <Text style={[styles.chevron, { color: iosColor('systemBlue', colors.primary) }]}>‹</Text>
          </Pressable>

          <Animated.Text style={[styles.weekTitle, { color: iosColor('label', colors.label), transform: [{ translateX: slide }] }]}>
            {weekTitle}
          </Animated.Text>

          <Pressable style={styles.chevronButton} onPress={() => void onChangeWeek('next')}>
            <Text style={[styles.chevron, { color: iosColor('systemBlue', colors.primary) }]}>›</Text>
          </Pressable>
        </BlurView>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingTop: insets.top + TOP_BAR_HEIGHT + 8, paddingBottom: 136 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={iosColor('systemBlue', colors.primary)} />}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionHeader, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>{section.title.toUpperCase()}</Text>
        )}
        renderItem={({ item, section }) => {
          const recipeName = item.recipe?.name || 'Receta';
          const emoji = item.recipe?.emoji || '🍽️';

          const row = (
            <Pressable
              onPress={() => void openEditor(item)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: iosColor('secondarySystemGroupedBackground', colors.card),
                },
                pressed && styles.rowPressed,
              ]}
            >
              <Text style={styles.rowEmoji}>{emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: iosColor('label', colors.label) }]}>{recipeName}</Text>
                <Text style={[styles.rowSubtitle, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>{item.servings} porciones</Text>
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
                  style={[styles.webRemove, { backgroundColor: iosColor('systemRed', colors.danger) }]}
                >
                  <Text style={styles.webRemoveText}>Quitar</Text>
                </Pressable>
              ) : null}
            </Pressable>
          );

          if (!Swipeable) return row;

          return (
            <Swipeable
              overshootRight={false}
              renderRightActions={() => (
                <View style={[styles.swipeAction, { backgroundColor: iosColor('systemRed', colors.danger) }]}>
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
            <View style={[styles.row, { backgroundColor: iosColor('secondarySystemGroupedBackground', colors.card) }]}>
              <Text style={[styles.emptyRowText, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>Sin comidas planificadas</Text>
            </View>
          )
        }
      />

      <View style={[styles.footerWrap, { bottom: 78 + insets.bottom / 2 }]}> 
        <BlurView intensity={82} tint={isDark ? 'dark' : 'light'} style={styles.footerBlur}>
          <Text style={[styles.footerText, { color: iosColor('label', colors.label) }]}>
            {mealsCount} comidas · {distinctRecipes} recetas distintas
          </Text>
        </BlurView>
      </View>

      <Modal
        visible={Boolean(editingItem)}
        transparent={Platform.OS !== 'ios'}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
        onRequestClose={closeEditor}
      >
        <SafeAreaView style={[styles.sheetSafe, { backgroundColor: colors.background }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: colors.separator }]}>
            <Pressable onPress={closeEditor} style={styles.sheetHeaderButton}>
              <Text style={[styles.sheetHeaderAction, { color: colors.secondaryLabel }]}>Cancelar</Text>
            </Pressable>
            <Text style={[styles.sheetTitle, { color: colors.label }]}>Editar plato</Text>
            <Pressable onPress={() => void onSaveEdit()} disabled={savingEdit} style={styles.sheetHeaderButton}>
              <Text style={[styles.sheetHeaderAction, { color: colors.primary }]}>Guardar</Text>
            </Pressable>
          </View>

          <View style={styles.sheetContent}>
            <Text style={[styles.sheetRecipeName, { color: colors.label }]}>{editingItem?.recipe?.name || 'Receta'}</Text>

            <View style={styles.sheetBlock}>
              <QuantitySelector value={editingServings} onChange={setEditingServings} />
            </View>

            <View style={styles.sheetBlock}>
              <DaySelector selectedDays={editingDays} onToggleDay={toggleEditDay} />
            </View>

            <Pressable
              disabled={deletingEdit || savingEdit}
              onPress={() => void onDeleteEdit()}
              style={({ pressed }) => [
                styles.deleteButton,
                { backgroundColor: colors.danger },
                (pressed || deletingEdit) && styles.deleteButtonPressed,
              ]}
            >
              <Text style={[styles.deleteButtonText, { color: colors.card }]}>
                {deletingEdit ? 'Eliminando…' : 'Eliminar del plan'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topHeaderWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  topHeaderBlur: {
    height: TOP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: iosColor('separator', lightTheme.colors.separator),
    paddingHorizontal: 8,
  },
  chevronButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  chevron: { fontSize: 34, lineHeight: 34, fontWeight: '500' },
  weekTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: lightTheme.colors.label,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 3,
  },
  rowPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
  rowEmoji: { fontSize: 24, marginRight: 10 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowSubtitle: { fontSize: 13, marginTop: 2 },
  emptyRowText: { fontSize: 15, fontStyle: 'italic' },
  swipeAction: {
    width: 92,
    borderRadius: 18,
    marginRight: 16,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeActionText: { color: lightTheme.colors.card, fontSize: 15, fontWeight: '700' },
  webRemove: { minHeight: 30, borderRadius: 8, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  webRemoveText: { color: lightTheme.colors.card, fontSize: 12, fontWeight: '700' },
  footerWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  footerBlur: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, fontWeight: '700' },
  sheetSafe: {
    flex: 1,
  },
  sheetHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  sheetHeaderButton: {
    minWidth: 68,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHeaderAction: {
    fontSize: 16,
    fontWeight: '600',
  },
  sheetTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sheetRecipeName: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  sheetBlock: {
    marginBottom: 14,
  },
  deleteButton: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  deleteButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
});
