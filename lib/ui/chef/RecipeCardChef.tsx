import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Recipe } from '../../types';
import { useTheme } from '../../theme';

type RecipeCardChefProps = {
  recipe: Recipe;
  onPress: (id: string) => void;
  onEdit: (id: string) => void;
  onTogglePublish: (id: string, current: boolean) => void;
  isToggling?: boolean;
};

function getTimeLabel(recipe: Recipe) {
  const minutes = Number(recipe.prep_time_minutes ?? 0);
  if (minutes > 0) return `${minutes} min`;
  return 'Sin tiempo';
}

export const RecipeCardChef = memo(function RecipeCardChef({
  recipe,
  onPress,
  onEdit,
  onTogglePublish,
  isToggling = false,
}: RecipeCardChefProps) {
  const { colors, shadows } = useTheme();
  const isPublished = Boolean(recipe.is_published);

  return (
    <Pressable
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
      <View style={styles.topRow}>
        {recipe.image_url ? (
          <Image source={{ uri: recipe.image_url }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.coverFallback, { backgroundColor: colors.fill }]}>
            <Ionicons name="restaurant-outline" size={28} color={colors.secondaryLabel} />
          </View>
        )}

        <View style={styles.infoWrap}>
          <Text style={[styles.title, { color: colors.label }]} numberOfLines={1}>
            {recipe.title}
          </Text>
          <Text style={[styles.category, { color: colors.secondaryLabel }]} numberOfLines={1}>
            {recipe.category || 'Sin categoría'}
          </Text>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isPublished ? colors.success : colors.tertiaryLabel },
              ]}
            />
            <Text style={[styles.statusText, { color: colors.secondaryLabel }]}>
              {isPublished ? 'Publicada' : 'Borrador'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.chipsRow}>
        <View style={[styles.chip, { backgroundColor: colors.background }]}>
          <Ionicons name="time-outline" size={13} color={colors.secondaryLabel} />
          <Text style={[styles.chipText, { color: colors.secondaryLabel }]}>{getTimeLabel(recipe)}</Text>
        </View>

        <View style={[styles.chip, { backgroundColor: colors.background }]}>
          <Ionicons name="people-outline" size={13} color={colors.secondaryLabel} />
          <Text style={[styles.chipText, { color: colors.secondaryLabel }]}>
            {Math.max(1, recipe.servings || 1)} porciones
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => onEdit(recipe.id)}
          style={({ pressed }) => [
            styles.secondaryAction,
            { borderColor: colors.separator, backgroundColor: colors.background },
            pressed && styles.actionPressed,
          ]}
        >
          <Ionicons name="create-outline" size={16} color={colors.primary} />
          <Text style={[styles.secondaryActionText, { color: colors.primary }]}>Editar</Text>
        </Pressable>

        <Pressable
          disabled={isToggling}
          onPress={() => onTogglePublish(recipe.id, isPublished)}
          style={({ pressed }) => [
            styles.primaryAction,
            { backgroundColor: isPublished ? colors.warning : colors.success },
            (pressed || isToggling) && styles.actionPressed,
          ]}
        >
          <Ionicons
            name={isPublished ? 'cloud-offline-outline' : 'cloud-upload-outline'}
            size={16}
            color={colors.card}
          />
          <Text style={[styles.primaryActionText, { color: colors.card }]}>{isPublished ? 'Despublicar' : 'Publicar'}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
  },
  cardPressed: {
    transform: [{ scale: 0.992 }],
    opacity: 0.95,
  },
  topRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cover: {
    width: 86,
    height: 86,
    borderRadius: 14,
  },
  coverFallback: {
    width: 86,
    height: 86,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoWrap: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  category: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  statusRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    minHeight: 28,
    alignItems: 'center',
    flexDirection: 'row',
  },
  chipText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  secondaryActionText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryAction: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryActionText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '700',
  },
  actionPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
});
