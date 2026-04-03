import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  PlatformColor,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { PlanItemWithRecipe, startOfWeekMonday, toISODate, useConsumerStore } from '../../lib/stores/consumerStore';
import { useTheme } from '../../lib/theme';
import { showToast } from '../../lib/utils/toast';
import { DaySelector } from '../../lib/ui/consumer/menu/DaySelector';
import { QuantitySelector } from '../../lib/ui/consumer/menu/QuantitySelector';

function iosColor(name: string, fallback: string) {
  return Platform.OS === 'ios' ? PlatformColor(name) : fallback;
}

type DayBlock = {
  key: string;
  label: string;
  date: Date;
  items: PlanItemWithRecipe[];
};

type IngredientLike = {
  grams?: unknown;
  caloriesPer100g?: unknown;
  calories_per_100g?: unknown;
  pricePer100g?: unknown;
  price_per_100g?: unknown;
};

type DayRow = {
  type: 'day';
  key: string;
  dayKey: string;
  label: string;
  dateLabel: string;
  isFirst: boolean;
};

type EmptyRow = {
  type: 'empty';
  key: string;
  dayKey: string;
};

type RecipeRow = {
  type: 'recipe';
  key: string;
  dayKey: string;
  planItemId: number;
  recipeId: number;
  recipeName: string;
  emoji: string;
  servings: number;
  metrics: { calories: number | null; price: number | null } | null;
  itemRef: PlanItemWithRecipe;
};

type TimelineRow = DayRow | EmptyRow | RecipeRow;

const dayMap = [
  { key: 'mon', long: 'Lunes' },
  { key: 'tue', long: 'Martes' },
  { key: 'wed', long: 'Miércoles' },
  { key: 'thu', long: 'Jueves' },
  { key: 'fri', long: 'Viernes' },
  { key: 'sat', long: 'Sábado' },
  { key: 'sun', long: 'Domingo' },
];

const TOP_BAR_HEIGHT = 56;

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getRecipeMetrics(item: PlanItemWithRecipe) {
  const ingredients = Array.isArray(item.recipe?.ingredients) ? (item.recipe?.ingredients as IngredientLike[]) : [];
  if (!ingredients.length) return null;

  const totals = ingredients.reduce(
    (acc, ingredient) => {
      const grams = toNumber(ingredient.grams);
      const caloriesPer100g = toNumber(ingredient.caloriesPer100g ?? ingredient.calories_per_100g);
      const pricePer100g = toNumber(ingredient.pricePer100g ?? ingredient.price_per_100g);
      acc.calories += (grams / 100) * caloriesPer100g;
      acc.price += (grams / 100) * pricePer100g;
      return acc;
    },
    { calories: 0, price: 0 }
  );

  if (totals.calories <= 0 && totals.price <= 0) return null;

  return {
    calories: totals.calories > 0 ? Math.round(totals.calories) : null,
    price: totals.price > 0 ? Math.round(totals.price / 10) * 10 : null,
  };
}

function resolveDayForRecipeRow(data: TimelineRow[], rowKey: string): string | null {
  let currentDay: string | null = null;
  for (const row of data) {
    if (row.type === 'day') currentDay = row.dayKey;
    if (row.key === rowKey && row.type === 'recipe') return currentDay;
  }
  return null;
}

export default function ConsumerWeekScreen() {
  const { colors, spacing, radius, shadows, scheme, typography } = useTheme();
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
  const [timelineRows, setTimelineRows] = useState<TimelineRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [copyingPreviousWeek, setCopyingPreviousWeek] = useState(false);
  const draggingRowKeyRef = useRef<string | null>(null);

  const timelineOpacity = useRef(new Animated.Value(1)).current;
  const timelineTranslate = useRef(new Animated.Value(0)).current;

  const dayBlocks = useMemo<DayBlock[]>(() => {
    return dayMap.map((day, index) => {
      const date = new Date(selectedWeekStart);
      date.setDate(selectedWeekStart.getDate() + index);
      return {
        key: day.key,
        label: day.long,
        date,
        items: planItems.filter((item) => item.days.includes(day.key)),
      };
    });
  }, [planItems, selectedWeekStart]);

  const computedRows = useMemo<TimelineRow[]>(() => {
    const rows: TimelineRow[] = [];
    dayBlocks.forEach((day, index) => {
      rows.push({
        type: 'day',
        key: `day-${day.key}`,
        dayKey: day.key,
        label: day.label,
        dateLabel: day.date.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit' }),
        isFirst: index === 0,
      });

      if (!day.items.length) {
        rows.push({
          type: 'empty',
          key: `empty-${day.key}`,
          dayKey: day.key,
        });
        return;
      }

      day.items.forEach((item) => {
        rows.push({
          type: 'recipe',
          key: `item-${day.key}-${item.id}`,
          dayKey: day.key,
          planItemId: item.id,
          recipeId: item.recipe_id,
          recipeName: item.recipe?.name || 'Receta',
          emoji: item.recipe?.emoji || '🍽️',
          servings: Math.max(1, item.servings || 1),
          metrics: getRecipeMetrics(item),
          itemRef: item,
        });
      });
    });
    return rows;
  }, [dayBlocks]);

  useEffect(() => {
    if (!isDragging) {
      setTimelineRows(computedRows);
    }
  }, [computedRows, isDragging]);

  const weekTitle = useMemo(() => {
    const start = new Date(selectedWeekStart);
    const end = new Date(selectedWeekStart);
    end.setDate(start.getDate() + 6);

    const monthRaw = end.toLocaleDateString('es-UY', { month: 'short' }).replace('.', '').trim();
    const month = monthRaw ? monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1) : '';
    return `Lun ${start.getDate()} — Dom ${end.getDate()} ${month}`;
  }, [selectedWeekStart]);

  const onChangeWeek = async (direction: 'prev' | 'next') => {
    await Haptics.selectionAsync();

    Animated.parallel([
      Animated.timing(timelineOpacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(timelineTranslate, {
        toValue: direction === 'next' ? -14 : 14,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      await navigateWeek(direction);
      timelineTranslate.setValue(direction === 'next' ? 14 : -14);
      Animated.parallel([
        Animated.timing(timelineOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(timelineTranslate, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const onRefresh = async () => {
    if (!currentPlan?.id) return;
    setRefreshing(true);
    await fetchPlanItems(currentPlan.id);
    setRefreshing(false);
  };

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

  const onDeleteFromSwipe = async (row: RecipeRow) => {
    try {
      await removePlanItem(row.planItemId);
      showToast({ type: 'success', message: 'Eliminado del plan' });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      showToast({ type: 'error', message: 'No se pudo eliminar del plan' });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const copyPreviousWeek = async () => {
    if (copyingPreviousWeek) return;
    if (!currentPlan?.id) {
      showToast({ type: 'error', message: 'No encontramos tu semana actual' });
      return;
    }

    try {
      setCopyingPreviousWeek(true);
      await Haptics.selectionAsync();

      const session = (await supabase.auth.getSession()).data.session;
      const consumerId = session?.user?.id;
      if (!consumerId) {
        showToast({ type: 'error', message: 'Iniciá sesión nuevamente' });
        return;
      }

      const previousWeek = startOfWeekMonday(new Date(selectedWeekStart));
      previousWeek.setDate(previousWeek.getDate() - 7);
      const previousWeekISO = toISODate(previousWeek);

      const { data: previousPlan, error: previousPlanError } = await supabase
        .from('weekly_plans')
        .select('id')
        .eq('consumer_id', consumerId)
        .eq('week_start', previousWeekISO)
        .maybeSingle();

      if (previousPlanError || !previousPlan?.id) {
        showToast({ type: 'warning', message: 'No hay semana anterior para copiar' });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      const { data: previousItems, error: previousItemsError } = await supabase
        .from('plan_items')
        .select('recipe_id,servings,days')
        .eq('plan_id', previousPlan.id);

      if (previousItemsError) {
        showToast({ type: 'error', message: 'No pudimos leer la semana anterior' });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      if (!previousItems?.length) {
        showToast({ type: 'warning', message: 'La semana anterior no tiene comidas' });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      const { error: clearError } = await supabase.from('plan_items').delete().eq('plan_id', currentPlan.id);
      if (clearError) {
        showToast({ type: 'error', message: 'No pudimos reemplazar tu semana actual' });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      for (const item of previousItems as Array<{ recipe_id: number; servings: number | null; days: string[] | null }>) {
        const safeDays = Array.isArray(item.days) ? item.days : [];
        if (!safeDays.length) continue;
        await upsertPlanItem(item.recipe_id, Math.max(1, Number(item.servings) || 1), safeDays);
      }

      await fetchPlanItems(currentPlan.id);
      showToast({ type: 'success', message: 'Semana copiada' });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      showToast({ type: 'error', message: 'No se pudo copiar la semana anterior' });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setCopyingPreviousWeek(false);
    }
  };

  const onRepeatPreviousWeek = () => {
    if (copyingPreviousWeek) return;

    if (planItems.length > 0) {
      Alert.alert(
        'Sobrescribir semana',
        'Esto sobrescribirá tu semana actual. ¿Querés continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sobrescribir', style: 'destructive', onPress: () => void copyPreviousWeek() },
        ]
      );
      return;
    }

    void copyPreviousWeek();
  };

  const onDragEnd = async (data: TimelineRow[]) => {
    setTimelineRows(data);
    setIsDragging(false);

    const draggingKey = draggingRowKeyRef.current;
    draggingRowKeyRef.current = null;
    if (!draggingKey) return;

    const moved = data.find((row) => row.key === draggingKey && row.type === 'recipe');
    if (!moved || moved.type !== 'recipe') return;

    const targetDay = resolveDayForRecipeRow(data, moved.key);
    if (!targetDay || targetDay === moved.dayKey) return;

    const freshItem = planItems.find((item) => item.id === moved.planItemId);
    if (!freshItem) return;

    const nextDays = Array.from(
      new Set([...(freshItem.days ?? []).filter((day) => day !== moved.dayKey), targetDay])
    );

    try {
      await upsertPlanItem(freshItem.recipe_id, Math.max(1, freshItem.servings || 1), nextDays);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({ type: 'success', message: `Movido a ${dayMap.find((d) => d.key === targetDay)?.long || 'otro día'}` });
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast({ type: 'error', message: 'No se pudo mover el pedido' });
    }
  };

  const renderRow = ({ item, drag, isActive }: RenderItemParams<TimelineRow>) => {
    if (item.type === 'day') {
      return (
        <View style={[styles.dayBlock, !item.isFirst && styles.dayBlockGap]}>
          <View style={styles.dayHeader}>
            <Text style={[styles.dayTitle, { color: iosColor('label', colors.label) }]}>{item.label}</Text>
            <Text style={[styles.dayDate, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>{item.dateLabel}</Text>
          </View>
          <View style={[styles.dayDivider, { backgroundColor: colors.separator }]} />
        </View>
      );
    }

    if (item.type === 'empty') {
      return (
        <View style={[styles.emptyCard, { backgroundColor: iosColor('tertiarySystemFill', colors.fill) }]}>
          <Text style={[styles.emptyText, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>Sin comidas planificadas</Text>
        </View>
      );
    }

    const card = (
      <Pressable
        onLongPress={() => void openEditor(item.itemRef)}
        delayLongPress={220}
        style={({ pressed }) => [
          styles.recipeCard,
          {
            backgroundColor: iosColor('secondarySystemGroupedBackground', colors.card),
            shadowColor: colors.label,
            borderRadius: radius.large,
            borderColor: colors.separator,
            borderWidth: StyleSheet.hairlineWidth,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.sm,
            marginBottom: spacing.sm,
            opacity: isActive ? 0.88 : 1,
          },
          shadows.card,
          (pressed || isActive) && styles.recipeCardPressed,
        ]}
      >
        <View style={styles.recipeTopRow}>
          <View style={[styles.mediaThumb, { backgroundColor: iosColor('tertiarySystemFill', colors.fill), borderRadius: radius.medium }]}>
            {item.itemRef.recipe?.photo_url ? (
              <Image source={{ uri: item.itemRef.recipe.photo_url }} style={styles.mediaImage} resizeMode="cover" />
            ) : (
              <Text style={styles.rowEmoji}>{item.emoji}</Text>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.recipeName, { color: iosColor('label', colors.label) }]} numberOfLines={1}>
              {item.recipeName}
            </Text>
            <View style={[styles.servingsBadge, { backgroundColor: iosColor('tertiarySystemFill', colors.fill) }]}>
              <Text style={[styles.servingsBadgeText, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>
                {item.servings} porciones
              </Text>
            </View>
          </View>

          <View style={styles.actionsCol}>
            <Pressable
              hitSlop={10}
              onPress={() => void onDeleteFromSwipe(item)}
              style={[styles.iconButton, { backgroundColor: iosColor('tertiarySystemFill', colors.fill) }]}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>

            <Pressable
              hitSlop={10}
              onPressIn={async () => {
                await Haptics.selectionAsync();
                draggingRowKeyRef.current = item.key;
                drag();
              }}
              style={[styles.iconButton, { backgroundColor: iosColor('tertiarySystemFill', colors.fill) }]}
            >
              <Ionicons name="reorder-three-outline" size={20} color={colors.secondaryLabel} />
            </Pressable>
          </View>
        </View>

        {item.metrics ? (
          <View style={styles.metricsRow}>
            {item.metrics.calories ? (
              <Text style={[styles.metricText, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>
                {item.metrics.calories} kcal
              </Text>
            ) : null}
            {item.metrics.price ? (
              <Text style={[styles.metricText, { color: iosColor('secondaryLabel', colors.secondaryLabel) }]}>
                ${item.metrics.price}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Pressable>
    );

    if (Platform.OS === 'web') return card;

    return (
      <Swipeable
        overshootRight={false}
        renderRightActions={() => (
          <Pressable
            onPress={() => void onDeleteFromSwipe(item)}
            style={[
              styles.swipeDelete,
              {
                backgroundColor: colors.danger,
                borderRadius: radius.large,
                marginBottom: spacing.sm,
              },
            ]}
          >
            <Text style={[styles.swipeDeleteText, { color: colors.card }]}>Eliminar</Text>
          </Pressable>
        )}
      >
        {card}
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: iosColor('systemGroupedBackground', colors.background) }]}>
      <View style={[styles.topHeaderWrap, { paddingTop: insets.top }]}>
        <BlurView
          intensity={82}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          style={[styles.topHeaderBlur, { borderBottomColor: colors.separator, paddingHorizontal: spacing.xs }]}
        >
          <Pressable style={styles.chevronButton} onPress={() => void onChangeWeek('prev')}>
            <Text style={[styles.chevron, { color: iosColor('systemBlue', colors.primary) }]}>‹</Text>
          </Pressable>

          <Text style={[styles.weekTitle, typography.subtitle, { color: iosColor('label', colors.label) }]} numberOfLines={1}>
            {weekTitle}
          </Text>

          <Pressable style={styles.chevronButton} onPress={() => void onChangeWeek('next')}>
            <Text style={[styles.chevron, { color: iosColor('systemBlue', colors.primary) }]}>›</Text>
          </Pressable>
        </BlurView>
      </View>

      <Animated.View style={{ flex: 1, opacity: timelineOpacity, transform: [{ translateX: timelineTranslate }] }}>
        <DraggableFlatList
          data={timelineRows}
          keyExtractor={(item) => item.key}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + TOP_BAR_HEIGHT + spacing.xs,
            paddingHorizontal: spacing.md,
            paddingBottom: 132 + insets.bottom,
          }}
          ListHeaderComponent={
            <View style={[styles.repeatActionWrap, { marginBottom: spacing.sm }]}>
              <Pressable
                onPress={onRepeatPreviousWeek}
                disabled={copyingPreviousWeek}
                style={({ pressed }) => [
                  styles.repeatButton,
                  {
                    backgroundColor: iosColor('systemBlue', colors.primary),
                    borderRadius: radius.medium + 2,
                    opacity: pressed || copyingPreviousWeek ? 0.9 : 1,
                  },
                  shadows.button,
                ]}
              >
                <Ionicons name="copy-outline" size={16} color={colors.card} />
                <Text style={[styles.repeatButtonText, { color: colors.card }]}>
                  {copyingPreviousWeek ? 'Copiando semana...' : 'Repetir semana anterior'}
                </Text>
              </Pressable>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={iosColor('systemBlue', colors.primary)}
            />
          }
          onDragBegin={() => setIsDragging(true)}
          onDragEnd={({ data }) => void onDragEnd(data)}
          renderItem={renderRow}
          containerStyle={{ flex: 1 }}
        />
      </Animated.View>

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
  },
  chevronButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  chevron: { fontSize: 34, lineHeight: 34, fontWeight: '500' },
  weekTitle: {
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  repeatActionWrap: {},
  repeatButton: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  repeatButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  dayBlock: {
    marginBottom: 0,
  },
  dayBlockGap: {
    marginTop: 20,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  dayTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  dayDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  dayDivider: {
    marginTop: 8,
    marginBottom: 10,
    height: StyleSheet.hairlineWidth,
  },
  recipeCard: {
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  recipeCardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.992 }],
  },
  recipeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaThumb: {
    width: 56,
    height: 56,
    overflow: 'hidden',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  rowEmoji: {
    fontSize: 24,
  },
  recipeName: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  servingsBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  servingsBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  actionsCol: {
    marginLeft: 10,
    gap: 6,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
  },
  metricText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  swipeDelete: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDeleteText: {
    fontSize: 14,
    fontWeight: '700',
  },
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
