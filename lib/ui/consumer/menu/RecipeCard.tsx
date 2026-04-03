import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Recipe as ConsumerRecipe } from '../../../stores/consumerStore';
import { useTheme } from '../../../theme';

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
  bg: string;
};

function caloriesTone(calories: number): IndicatorTone {
  if (calories <= 500) {
    return { bg: 'success' };
  }
  if (calories <= 800) {
    return { bg: 'warning' };
  }
  return { bg: 'danger' };
}

function priceTone(price: number): IndicatorTone {
  if (price <= 250) {
    return { bg: 'success' };
  }
  if (price <= 450) {
    return { bg: 'warning' };
  }
  return { bg: 'danger' };
}

function withAlpha(color: string, alpha: number) {
  if (!color.startsWith('#')) return color;
  const value = color.slice(1);
  const normalized = value.length === 3 ? value.split('').map((char) => char + char).join('') : value;
  if (normalized.length !== 6) return color;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const RecipeCard = memo(function RecipeCard({
  recipe,
  onPress,
}: RecipeCardProps) {
  const { colors, shadows, spacing } = useTheme();
  const metrics = useMemo(() => computeMetrics(recipe), [recipe]);
  const difficultyLabel = normalizeDifficulty(recipe.difficulty);
  const priceIndicator = priceTone(metrics.price);
  const calorieIndicator = caloriesTone(metrics.calories);
  const mediaBg = colors.fillStrong;
  const badgeTextColor = colors.onImage;
  const priceBg =
    priceIndicator.bg === 'success'
      ? withAlpha(colors.success, 0.85)
      : priceIndicator.bg === 'warning'
        ? withAlpha(colors.warning, 0.85)
        : withAlpha(colors.danger, 0.82);
  const caloriesBg =
    calorieIndicator.bg === 'success'
      ? withAlpha(colors.success, 0.82)
      : calorieIndicator.bg === 'warning'
        ? withAlpha(colors.warning, 0.82)
        : withAlpha(colors.danger, 0.82);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(recipe.id)}
      style={({ pressed }) => [
        styles.card,
        {
          borderRadius: 20,
        },
        shadows.button,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.mediaWrap, { backgroundColor: mediaBg }]}>
        {recipe.photo_url ? (
          <Image source={{ uri: recipe.photo_url }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.fallbackImage, { backgroundColor: mediaBg }]}>
            <Text style={styles.fallbackEmoji}>{recipe.emoji || '🍽️'}</Text>
          </View>
        )}

        <View pointerEvents="none" style={styles.overlay}>
          <LinearGradient
            colors={['transparent', withAlpha(colors.overlaySoft, 0.3), withAlpha(colors.overlayStrong, 0.82)]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.overlayGradient}
          >
            <View style={[styles.overlayContent, { padding: spacing.md }]}>
              <Text style={[styles.title, { color: badgeTextColor }]} numberOfLines={2}>
                {recipe.name}
              </Text>

              <View style={styles.badgesRow}>
                <View style={[styles.metricBadge, { backgroundColor: priceBg }]}>
                  <Text style={[styles.price, { color: badgeTextColor }]}>${metrics.price}</Text>
                  <Text style={[styles.estimatedTag, { color: badgeTextColor }]}>
                    {metrics.priceEstimated ? 'estimado' : 'precio'}
                  </Text>
                </View>

                <View style={[styles.metricBadge, { backgroundColor: caloriesBg }]}>
                  <Ionicons name="flame-outline" size={14} color={badgeTextColor} />
                  <Text style={[styles.caloriesText, { color: badgeTextColor }]}>{metrics.calories} kcal</Text>
                  {metrics.caloriesEstimated ? (
                    <Text style={[styles.estimatedTag, { color: badgeTextColor }]}>aprox</Text>
                  ) : null}
                </View>
              </View>

              {(recipe.time || difficultyLabel) ? (
                <View style={styles.metaRow}>
                  {recipe.time ? (
                    <Text style={[styles.metaText, { color: badgeTextColor }]}>{recipe.time}</Text>
                  ) : null}

                  {difficultyLabel ? (
                    <Text style={[styles.metaText, { color: badgeTextColor }]}>· {difficultyLabel}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          </LinearGradient>
        </View>

      </View>
    </Pressable>
  );
});

export const RecipeCardSkeleton = memo(function RecipeCardSkeleton() {
  const { colors } = useTheme();
  const mediaBg = colors.fill;
  return (
    <View style={[styles.card, { borderRadius: 20, backgroundColor: colors.card }]}>
      <View style={[styles.skeletonMedia, { backgroundColor: mediaBg }]} />
      <View style={styles.skeletonOverlay}>
        <View style={[styles.skeletonLine, styles.skeletonLineLg, { backgroundColor: colors.fillStrong }]} />
        <View style={[styles.skeletonLine, styles.skeletonLineMd, { backgroundColor: colors.fillStrong }]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
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
  overlayGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    justifyContent: 'flex-end',
  },
  overlayContent: {
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  price: {
    fontSize: 20,
    lineHeight: 24,
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
    marginTop: 8,
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  skeletonMedia: {
    aspectRatio: 16 / 9,
  },
  skeletonOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    gap: 8,
  },
  skeletonLine: {
    borderRadius: 8,
  },
  skeletonLineLg: {
    height: 22,
    width: '62%',
  },
  skeletonLineMd: {
    height: 14,
    width: '40%',
  },
  skeletonBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
