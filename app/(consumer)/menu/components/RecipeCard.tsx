import { Ionicons } from '@expo/vector-icons';
import React, { memo, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Recipe as ConsumerRecipe } from '../../../../lib/stores/consumerStore';
import { useTheme } from '../../../../lib/theme';

type RecipeCardProps = {
  recipe: ConsumerRecipe;
  onPress: (id: number) => void;
};

type IngredientLike = {
  grams?: unknown;
  caloriesPer100g?: unknown;
  calories_per_100g?: unknown;
  pricePer100g?: unknown;
  price_per_100g?: unknown;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function computeMetrics(recipe: ConsumerRecipe) {
  const ingredients = Array.isArray(recipe.ingredients) ? (recipe.ingredients as IngredientLike[]) : [];

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

  const calories = totals.calories > 0 ? Math.round(totals.calories) : 520;
  const price = totals.price > 0 ? Math.round(totals.price / 10) * 10 : 250;

  return {
    calories,
    price,
    caloriesEstimated: totals.calories <= 0,
    priceEstimated: totals.price <= 0,
  };
}

function normalizeDifficulty(value: string | null) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'easy' || normalized === 'facil' || normalized === 'fácil') return 'Fácil';
  if (normalized === 'medium' || normalized === 'media') return 'Media';
  if (normalized === 'hard' || normalized === 'dificil' || normalized === 'difícil') return 'Difícil';
  return value;
}

type IndicatorTone = {
  text: string;
  bg: string;
};

function caloriesTone(calories: number): IndicatorTone {
  if (calories <= 500) {
    return { text: '#1A7F37', bg: 'rgba(52,199,89,0.16)' };
  }
  if (calories <= 800) {
    return { text: '#9A6700', bg: 'rgba(255,214,10,0.20)' };
  }
  return { text: '#C62828', bg: 'rgba(255,59,48,0.18)' };
}

function priceTone(price: number): IndicatorTone {
  if (price <= 250) {
    return { text: '#1A7F37', bg: 'rgba(52,199,89,0.16)' };
  }
  if (price <= 450) {
    return { text: '#9A6700', bg: 'rgba(255,214,10,0.20)' };
  }
  return { text: '#C62828', bg: 'rgba(255,59,48,0.18)' };
}

export const RecipeCard = memo(function RecipeCard({ recipe, onPress }: RecipeCardProps) {
  const { colors, shadows } = useTheme();
  const metrics = useMemo(() => computeMetrics(recipe), [recipe]);
  const difficultyLabel = normalizeDifficulty(recipe.difficulty);
  const priceIndicator = priceTone(metrics.price);
  const calorieIndicator = caloriesTone(metrics.calories);
  const mediaBg = colors.fill;
  const fallbackImageBg = colors.fillStrong;
  const pillBg = colors.background;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(recipe.id)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
        },
        shadows.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.mediaWrap, { backgroundColor: mediaBg }]}>
        {recipe.photo_url ? (
          <Image source={{ uri: recipe.photo_url }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.fallbackImage, { backgroundColor: fallbackImageBg }]}>
            <Text style={styles.fallbackEmoji}>{recipe.emoji || '🍽️'}</Text>
          </View>
        )}

        <View pointerEvents="none" style={styles.overlay}>
          <View style={styles.overlaySoft} />
          <View style={styles.overlayMedium} />
          <View style={styles.overlayStrong} />
          <View style={styles.overlayContent}>
            <Text style={[styles.title, { color: colors.card }]} numberOfLines={2}>
              {recipe.name}
            </Text>
          </View>
        </View>
      </View>

        <View style={styles.infoRow}>
        <View style={[styles.metricBadge, { backgroundColor: priceIndicator.bg }]}>
          <Text style={[styles.price, { color: priceIndicator.text }]}>${metrics.price}</Text>
          <Text style={[styles.estimatedTag, { color: priceIndicator.text }]}>{metrics.priceEstimated ? 'estimado' : 'precio'}</Text>
        </View>

        <View style={[styles.metricBadge, { backgroundColor: calorieIndicator.bg }]}>
          <Ionicons name="flame-outline" size={14} color={calorieIndicator.text} />
          <Text style={[styles.caloriesText, { color: calorieIndicator.text }]}>{metrics.calories} kcal</Text>
          {metrics.caloriesEstimated ? <Text style={[styles.estimatedTag, { color: calorieIndicator.text }]}>aprox</Text> : null}
        </View>
      </View>

      {(recipe.time || difficultyLabel) ? (
        <View style={styles.metaRow}>
          {recipe.time ? (
          <View style={[styles.metaPill, { backgroundColor: pillBg }]}>
              <Ionicons name="time-outline" size={12} color={colors.secondaryLabel} />
              <Text style={[styles.metaText, { color: colors.secondaryLabel }]}>{recipe.time}</Text>
            </View>
          ) : null}

          {difficultyLabel ? (
            <View style={[styles.metaPill, { backgroundColor: pillBg }]}>
              <Ionicons name="speedometer-outline" size={12} color={colors.secondaryLabel} />
              <Text style={[styles.metaText, { color: colors.secondaryLabel }]}>{difficultyLabel}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
});

export const RecipeCardSkeleton = memo(function RecipeCardSkeleton() {
  const { colors } = useTheme();
  const mediaBg = colors.fill;
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={[styles.skeletonMedia, { backgroundColor: mediaBg }]} />
      <View style={styles.skeletonBody}>
        <View style={[styles.skeletonLine, styles.skeletonLineLg, { backgroundColor: colors.fill }]} />
        <View style={[styles.skeletonLine, styles.skeletonLineMd, { backgroundColor: colors.fill }]} />
        <View style={[styles.skeletonLine, styles.skeletonLineSm, { backgroundColor: colors.fill }]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.987 }],
  },
  mediaWrap: {
    aspectRatio: 16 / 9,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEmoji: {
    fontSize: 44,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  overlaySoft: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  overlayMedium: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '68%',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  overlayStrong: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  overlayContent: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  title: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  price: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  estimatedTag: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  caloriesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caloriesText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  skeletonMedia: {
    aspectRatio: 16 / 9,
  },
  skeletonBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  skeletonLine: {
    borderRadius: 8,
    marginBottom: 10,
  },
  skeletonLineLg: {
    height: 22,
    width: '72%',
  },
  skeletonLineMd: {
    height: 16,
    width: '42%',
  },
  skeletonLineSm: {
    height: 14,
    width: '55%',
    marginBottom: 2,
  },
});
