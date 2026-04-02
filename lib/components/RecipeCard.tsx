import React, { memo } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { Recipe } from '../types';
import { useTheme } from '../hooks/useTheme';
import { getDifficultyLabel, useI18n } from '../i18n';

interface Props {
  recipe: Recipe;
  onPress: () => void;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80';

function RecipeCardBase({ recipe, onPress }: Props) {
  const { colors, isDark } = useTheme();
  const { language, t } = useI18n();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrapper,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.84 : 1,
          shadowOpacity: isDark ? 0 : 0.1,
        },
      ]}
    >
      <ImageBackground source={{ uri: recipe.image_url || FALLBACK_IMAGE }} style={styles.image} imageStyle={styles.imageRounded}>
        <View style={styles.badgeRow}>
          <Badge text={`${recipe.prep_time_minutes} ${t('minutes_suffix')}`} />
          <Badge text={getDifficultyLabel(recipe.difficulty, language)} />
        </View>
      </ImageBackground>

      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {recipe.title}
        </Text>
        <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>
          {recipe.category}
        </Text>
        {recipe.is_published ? (
          <View style={[styles.publishedBadge, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
            <Text style={styles.publishedBadgeText}>Publicada</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

export const RecipeCard = memo(RecipeCardBase);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 3,
  },
  image: {
    height: 188,
    justifyContent: 'flex-end',
  },
  imageRounded: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  body: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  meta: {
    fontSize: 14,
    marginTop: 4,
  },
  publishedBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 8,
    minHeight: 20,
    justifyContent: 'center',
  },
  publishedBadgeText: {
    color: '#34C759',
    fontSize: 11,
    fontWeight: '700',
  },
});
