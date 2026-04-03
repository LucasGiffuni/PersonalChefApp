import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConsumerStore } from '../../../lib/stores/consumerStore';
import { useTheme } from '../../../lib/theme';
import { showToast } from '../../../lib/utils/toast';
import { Card, PrimaryButton } from '../../../lib/ui';
import { DaySelector } from '../../../lib/ui/consumer/menu/DaySelector';
import { NutritionCard } from '../../../lib/ui/consumer/menu/NutritionCard';
import { QuantitySelector } from '../../../lib/ui/consumer/menu/QuantitySelector';

type IngredientLike = {
  name?: unknown;
  grams?: unknown;
  caloriesPer100g?: unknown;
  calories_per_100g?: unknown;
  proteinPer100g?: unknown;
  protein_per_100g?: unknown;
  fatPer100g?: unknown;
  fat_per_100g?: unknown;
  carbsPer100g?: unknown;
  carbs_per_100g?: unknown;
  pricePer100g?: unknown;
  price_per_100g?: unknown;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeIngredientName(raw: unknown) {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type IndicatorTone = {
  text: string;
  bg: string;
};

function caloriesTone(calories: number): IndicatorTone {
  if (calories <= 500) return { text: '#1A7F37', bg: 'rgba(52,199,89,0.16)' };
  if (calories <= 800) return { text: '#9A6700', bg: 'rgba(255,214,10,0.20)' };
  return { text: '#C62828', bg: 'rgba(255,59,48,0.18)' };
}

function priceTone(price: number): IndicatorTone {
  if (price <= 250) return { text: '#1A7F37', bg: 'rgba(52,199,89,0.16)' };
  if (price <= 450) return { text: '#9A6700', bg: 'rgba(255,214,10,0.20)' };
  return { text: '#C62828', bg: 'rgba(255,59,48,0.18)' };
}

const COMPACT_HEADER_HEIGHT = 52;

export default function RecipeDetailScreen() {
  const { colors, spacing, typography, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipeId = Number(id);

  const recipes = useConsumerStore((s) => s.recipes);
  const planItems = useConsumerStore((s) => s.planItems);
  const upsertPlanItem = useConsumerStore((s) => s.upsertPlanItem);

  const recipe = recipes.find((item) => item.id === recipeId) ?? null;
  const existingPlanItem = planItems.find((item) => item.recipe_id === recipeId) ?? null;
  const defaultRecipeServings = Math.max(1, Number((recipe as any)?.servings ?? 1));

  const [selectedServings, setSelectedServings] = useState(existingPlanItem?.servings ?? defaultRecipeServings);
  const [selectedDays, setSelectedDays] = useState<string[]>(existingPlanItem?.days ?? []);
  const [saving, setSaving] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const metrics = useMemo(() => {
    const ingredients = Array.isArray(recipe?.ingredients) ? (recipe?.ingredients as IngredientLike[]) : [];

    const totals = ingredients.reduce(
      (acc, ingredient) => {
        const grams = toNumber(ingredient.grams);
        const caloriesPer100g = toNumber(ingredient.caloriesPer100g ?? ingredient.calories_per_100g);
        const proteinPer100g = toNumber(ingredient.proteinPer100g ?? ingredient.protein_per_100g);
        const fatPer100g = toNumber(ingredient.fatPer100g ?? ingredient.fat_per_100g);
        const carbsPer100g = toNumber(ingredient.carbsPer100g ?? ingredient.carbs_per_100g);
        const pricePer100g = toNumber(ingredient.pricePer100g ?? ingredient.price_per_100g);

        acc.calories += (grams / 100) * caloriesPer100g;
        acc.protein += (grams / 100) * proteinPer100g;
        acc.fat += (grams / 100) * fatPer100g;
        acc.carbs += (grams / 100) * carbsPer100g;
        acc.price += (grams / 100) * pricePer100g;
        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0, price: 0 }
    );

    return {
      calories: totals.calories > 0 ? totals.calories : 520,
      protein: totals.protein,
      fat: totals.fat,
      carbs: totals.carbs,
      price: totals.price > 0 ? Math.round(totals.price / 10) * 10 : 250,
      priceEstimated: totals.price <= 0,
      caloriesEstimated: totals.calories <= 0,
    };
  }, [recipe?.ingredients]);
  const priceIndicator = priceTone(metrics.price);
  const calorieIndicator = caloriesTone(metrics.calories);

  const ingredientItems = useMemo(() => {
    if (!recipe || !Array.isArray(recipe.ingredients)) return [];

    return (recipe.ingredients as IngredientLike[])
      .map((ingredient) => normalizeIngredientName(ingredient?.name))
      .filter((item): item is string => Boolean(item));
  }, [recipe]);

  const toggleDay = async (day: string) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]));
    await Haptics.selectionAsync();
  };

  const onAddToOrder = async () => {
    if (!recipe) return;
    if (selectedServings <= 0) {
      Alert.alert('Cantidad inválida', 'La cantidad de personas debe ser mayor a 0.');
      return;
    }
    if (!selectedDays.length) {
      Alert.alert('Elegí al menos un día', 'Seleccioná en qué días querés recibir este plato.');
      return;
    }

    try {
      setSaving(true);
      await upsertPlanItem(recipe.id, selectedServings, selectedDays);
      showToast({
        type: 'success',
        message: 'Agregado a tu semana',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      showToast({
        type: 'error',
        message: 'Error al agregar',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  const compactHeaderOpacity = scrollY.interpolate({
    inputRange: [90, 170],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const ctaBottom = insets.bottom + spacing.xl + spacing.lg;
  const ctaHorizontal = spacing.md;
  const ctaReservedSpace = ctaBottom + spacing.xl * 3;
  const heroBackTop = insets.top + spacing.xs;
  const ctaButtonHeight = spacing.xl + spacing.lg;

  if (!recipe) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.missingWrap}>
          <Text style={[styles.missingTitle, { color: colors.label }]}>No encontramos este plato</Text>
          <Text style={[styles.missingText, { color: colors.secondaryLabel }]}>Volvé al menú y elegí otra opción.</Text>
          <PrimaryButton title="Volver" onPress={() => router.back()} style={styles.goBackButton} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.compactHeaderWrap, { paddingTop: insets.top, opacity: compactHeaderOpacity }]}> 
        <BlurView intensity={82} tint={scheme === 'dark' ? 'dark' : 'light'} style={[styles.compactHeaderBlur, { borderBottomColor: colors.separator }]}>
          <Pressable style={styles.compactBack} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </Pressable>
          <Text style={[styles.compactTitle, { color: colors.label }]} numberOfLines={1}>{recipe.name}</Text>
          <View style={styles.compactBack} />
        </BlurView>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: ctaReservedSpace }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        <View style={[styles.heroWrap, { backgroundColor: colors.fillStrong }]}>
          {recipe.photo_url ? (
            <Image source={{ uri: recipe.photo_url }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroFallback, { backgroundColor: colors.fillStrong }]}>
              <Text style={styles.heroEmoji}>{recipe.emoji || '🍽️'}</Text>
            </View>
          )}

          <View pointerEvents="none" style={styles.heroOverlay} />

          <Pressable style={[styles.backButton, { top: heroBackTop }]} onPress={() => router.back()}>
            <BlurView intensity={70} tint={scheme === 'dark' ? 'dark' : 'light'} style={styles.backBlur}>
              <Ionicons name="chevron-back" size={20} color={colors.label} />
            </BlurView>
          </Pressable>
        </View>

        <View style={[styles.body, { backgroundColor: colors.background, paddingHorizontal: spacing.md, paddingTop: spacing.lg }]}>
          <Text style={[styles.title, { color: colors.label, ...typography.title }]}>{recipe.name}</Text>

          <View style={[styles.mainStatsRow, { marginBottom: spacing.xs }]}>
            <View style={[styles.priceBadge, { backgroundColor: priceIndicator.bg }]}>
              <Text style={[styles.price, { color: priceIndicator.text }]}>${metrics.price}</Text>
              {metrics.priceEstimated ? <Text style={[styles.metricHint, { color: priceIndicator.text }]}>estimado</Text> : null}
            </View>
            <View style={[styles.caloriesWrap, { backgroundColor: calorieIndicator.bg }]}>
              <Ionicons name="flame-outline" size={18} color={calorieIndicator.text} />
              <Text style={[styles.caloriesText, { color: calorieIndicator.text }]}>{Math.round(metrics.calories)} kcal</Text>
            </View>
          </View>
          {metrics.caloriesEstimated ? <Text style={[styles.metricHint, { color: colors.secondaryLabel, marginBottom: spacing.md }]}>Calorías aproximadas</Text> : null}

          <View style={{ marginBottom: spacing.md }}>
            <NutritionCard calories={metrics.calories} protein={metrics.protein} fat={metrics.fat} carbs={metrics.carbs} />
          </View>

          <Card style={[styles.sectionCard, { marginBottom: spacing.md }]}>
            <Text style={[styles.sectionTitle, { color: colors.label, ...typography.subtitle, marginBottom: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.md }]}>
              Ingredientes
            </Text>
            {ingredientItems.length ? (
              ingredientItems.map((ingredient, index) => (
                <View
                  key={`${ingredient}-${index}`}
                  style={[
                    styles.ingredientRow,
                    {
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      borderBottomWidth: index < ingredientItems.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: colors.separator,
                    },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: colors.secondaryLabel }]} />
                  <Text style={[styles.ingredientText, { color: colors.label }]}>{ingredient}</Text>
                </View>
              ))
            ) : (
              <Text
                style={[
                  styles.secondaryText,
                  { color: colors.secondaryLabel, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
                ]}
              >
                Consultá con tu chef para conocer los ingredientes.
              </Text>
            )}
          </Card>

          <View style={{ marginBottom: spacing.md }}>
            <QuantitySelector value={selectedServings} onChange={setSelectedServings} />
          </View>
          <View style={{ marginBottom: spacing.md }}>
            <DaySelector selectedDays={selectedDays} onToggleDay={toggleDay} />
          </View>
        </View>
      </Animated.ScrollView>

      <View style={[styles.ctaWrap, { bottom: ctaBottom, left: ctaHorizontal, right: ctaHorizontal }]}> 
        <BlurView intensity={88} tint={scheme === 'dark' ? 'dark' : 'light'} style={[styles.ctaBlur, { borderRadius: spacing.md }]}>
          <PrimaryButton
            title={saving ? 'Guardando...' : 'Agregar a la semana'}
            onPress={() => void onAddToOrder()}
            disabled={saving || selectedDays.length === 0 || selectedServings <= 0}
            style={{
              minHeight: ctaButtonHeight,
              borderRadius: spacing.md,
              shadowOpacity: 0.1,
              shadowRadius: 10,
            }}
          />
        </BlurView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  compactHeaderWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 35,
  },
  compactHeaderBlur: {
    height: COMPACT_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compactBack: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  content: {
    paddingBottom: 0,
  },
  missingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  missingTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  missingText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  goBackButton: { marginTop: 18 },
  heroWrap: {
    height: 336,
    width: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 92,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  backButton: {
    position: 'absolute',
    left: 14,
  },
  backBlur: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  body: {
    marginTop: -18,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 0,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  mainStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  priceBadge: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  price: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  caloriesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  caloriesText: {
    marginLeft: 6,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  metricHint: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  sectionCard: {
    padding: 0,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  ingredientText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    flex: 1,
  },
  secondaryText: {
    fontSize: 15,
    lineHeight: 21,
  },
  ctaWrap: {
    position: 'absolute',
  },
  ctaBlur: {
    overflow: 'hidden',
  },
});
