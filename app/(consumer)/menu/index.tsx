import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConsumerStore, type Recipe } from '../../../lib/stores/consumerStore';
import { useTheme } from '../../../lib/theme';
import { Input } from '../../../lib/ui';
import { showToast } from '../../../lib/utils/toast';
import { RecipeCard, RecipeCardSkeleton } from '../../../lib/ui/consumer/menu/RecipeCard';

type MenuListItem =
  | { type: 'recipe'; item: Recipe }
  | { type: 'skeleton'; id: string };

const SKELETON_ITEMS: MenuListItem[] = Array.from({ length: 4 }, (_, index) => ({
  type: 'skeleton',
  id: `skeleton-${index}`,
}));

const HEADER_HEIGHT = 52;

export default function ConsumerMenuScreen() {
  const { colors, radius, typography, scheme, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const recipes = useConsumerStore((s) => s.recipes);
  const favorites = useConsumerStore((s) => s.favorites);
  const favoriteRecipeIds = useConsumerStore((s) => s.favoriteRecipeIds);
  const toggleFavorite = useConsumerStore((s) => s.toggleFavorite);
  const chefId = useConsumerStore((s) => s.chefId);
  const chefName = useConsumerStore((s) => s.chefName);

  const [query, setQuery] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (recipes.length > 0) {
      setIsInitialLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 850);

    return () => clearTimeout(timer);
  }, [recipes.length]);

  const filteredRecipes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return recipes;

    return recipes.filter((recipe) => {
      const byName = recipe.name.toLowerCase().includes(normalized);
      const byCategory = String(recipe.cat ?? '')
        .toLowerCase()
        .includes(normalized);
      return byName || byCategory;
    });
  }, [query, recipes]);

  const isLoading = Boolean(chefId) && recipes.length === 0 && isInitialLoading;

  const listData = useMemo<MenuListItem[]>(() => {
    if (isLoading) return SKELETON_ITEMS;
    return filteredRecipes.map((item) => ({ type: 'recipe', item }));
  }, [filteredRecipes, isLoading]);

  const onPressRecipe = useCallback(
    (id: number) => {
      router.push(`/(consumer)/menu/${id}`);
    },
    [router]
  );

  const onToggleFavorite = useCallback(
    async (id: number) => {
      if (favoritePendingId === id) return;
      setFavoritePendingId(id);
      try {
        const result = await toggleFavorite(id);
        if (result === 'added') {
          showToast({ type: 'success', message: 'Agregado a favoritos' });
        } else if (result === 'removed') {
          showToast({ type: 'success', message: 'Eliminado de favoritos' });
        } else {
          showToast({
            type: 'error',
            message: 'No pudimos actualizar favoritos. Revisá la tabla favorites en Supabase.',
          });
        }
      } catch {
        showToast({
          type: 'error',
          message: 'No pudimos actualizar favoritos',
        });
      } finally {
        setFavoritePendingId(null);
      }
    },
    [favoritePendingId, toggleFavorite]
  );

  const compactHeaderOpacity = scrollY.interpolate({
    inputRange: [40, 92],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const largeTitleOpacity = scrollY.interpolate({
    inputRange: [0, 38],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[
        styles.safe,
        { backgroundColor: colors.background },
      ]}
    >
      <Animated.View style={[styles.compactHeaderWrap, { paddingTop: insets.top, opacity: compactHeaderOpacity }]} pointerEvents="none">
        <BlurView intensity={75} tint={scheme === 'dark' ? 'dark' : 'light'} style={[styles.compactHeaderBlur, { borderBottomColor: colors.separator }]}>
          <Text style={[styles.compactHeaderTitle, { color: colors.label }]}>Menú del chef</Text>
        </BlurView>
      </Animated.View>

      <Animated.FlatList
        data={listData}
        keyExtractor={(row) => (row.type === 'skeleton' ? row.id : String(row.item.id))}
        renderItem={({ item }) => {
          if (item.type === 'skeleton') {
            return <RecipeCardSkeleton />;
          }

          return (
            <RecipeCard
              recipe={item.item}
              onPress={onPressRecipe}
            />
          );
        }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={8}
        contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + HEADER_HEIGHT }]}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Animated.Text style={[styles.largeTitle, { color: colors.label, opacity: largeTitleOpacity, ...typography.title }]}>Menú del chef</Animated.Text>
            {chefName ? (
              <Text style={[styles.subtitle, { color: colors.secondaryLabel }]} numberOfLines={1}>
                Seleccioná tu próximo plato de {chefName}
              </Text>
            ) : null}

            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar platos"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
              icon={<Ionicons name="search" size={18} color={colors.secondaryLabel} />}
              containerStyle={[styles.searchWrap, shadows.card, { backgroundColor: colors.card, borderRadius: radius.medium + 6 }]}
            />

            <View style={styles.favoritesSection}>
              <View style={styles.favoritesHeader}>
                <Text style={[styles.favoritesTitle, { color: colors.label }]}>Favoritos</Text>
                <Text style={[styles.favoritesCount, { color: colors.secondaryLabel }]}>
                  {favorites.length} guardados
                </Text>
              </View>

              {favorites.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favoritesRow}>
                  {favorites.map((favorite) => (
                    <Pressable
                      key={favorite.id}
                      onPress={() => onPressRecipe(favorite.id)}
                      style={({ pressed }) => [
                        styles.favoriteChip,
                        shadows.card,
                        { backgroundColor: colors.card, borderColor: colors.separator },
                        pressed && styles.favoriteChipPressed,
                      ]}
                    >
                      <Text style={styles.favoriteEmoji}>{favorite.emoji || '🍽️'}</Text>
                      <Text style={[styles.favoriteName, { color: colors.label }]} numberOfLines={1}>
                        {favorite.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <View style={[styles.favoritesEmpty, { backgroundColor: colors.card, borderColor: colors.separator }]}>
                  <Ionicons name="heart-outline" size={16} color={colors.secondaryLabel} />
                  <Text style={[styles.favoritesEmptyText, { color: colors.secondaryLabel }]}>
                    Tocá el corazon en un plato para guardarlo aca.
                  </Text>
                </View>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: colors.card },
              ]}
            >
              <Ionicons name="restaurant-outline" size={30} color={colors.secondaryLabel} />
            </View>

            <Text style={[styles.emptyTitle, { color: colors.label }]}>
              {query.trim() ? 'No encontramos platos con ese nombre' : 'Todavía no hay platos disponibles'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.secondaryLabel }]}>
              {query.trim()
                ? 'Probá ajustando la búsqueda para descubrir más opciones.'
                : 'Tu chef va a publicar nuevas recetas muy pronto.'}
            </Text>
          </View>
        }
      />
    </View>
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
    zIndex: 20,
  },
  compactHeaderBlur: {
    height: HEADER_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactHeaderTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  headerBlock: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  largeTitle: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  searchWrap: {
    marginTop: 16,
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoritesSection: {
    marginTop: 16,
  },
  favoritesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  favoritesTitle: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  favoritesCount: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  favoritesRow: {
    paddingRight: 4,
    gap: 10,
  },
  favoriteChip: {
    width: 132,
    minHeight: 84,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  favoriteChipPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  favoriteEmoji: {
    fontSize: 22,
  },
  favoriteName: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  favoritesEmpty: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoritesEmptyText: {
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
});
  const [favoritePendingId, setFavoritePendingId] = useState<number | null>(null);
