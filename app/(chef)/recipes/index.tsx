import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchRecipes } from '../../../lib/services/recipes';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/stores/authStore';
import { useTheme } from '../../../lib/theme';
import { Recipe } from '../../../lib/types';
import { RecipeCardChef } from '../../../lib/ui/chef/RecipeCardChef';

type FilterKey = 'all' | 'published' | 'draft';

type FilterChip = {
  key: FilterKey;
  label: string;
};

const FILTERS: FilterChip[] = [
  { key: 'all', label: 'Todas' },
  { key: 'published', label: 'Publicadas' },
  { key: 'draft', label: 'Borradores' },
];

const HEADER_HEIGHT = 52;

export default function ChefRecipesScreen() {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.session?.user?.id);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingById, setTogglingById] = useState<Record<string, boolean>>({});
  const scrollY = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    if (!userId) {
      setRecipes([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchRecipes(userId);
      setRecipes(data);
    } catch {
      setRecipes([]);
      setError('No se pudieron cargar las recetas.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const publishedCount = useMemo(() => recipes.filter((item) => item.is_published).length, [recipes]);

  const filteredRecipes = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return recipes.filter((recipe) => {
      const matchQuery =
        !normalized ||
        recipe.title.toLowerCase().includes(normalized) ||
        recipe.category.toLowerCase().includes(normalized);

      const matchFilter =
        activeFilter === 'all' ||
        (activeFilter === 'published' && recipe.is_published) ||
        (activeFilter === 'draft' && !recipe.is_published);

      return matchQuery && matchFilter;
    });
  }, [activeFilter, query, recipes]);

  const onPressRecipe = async (id: string) => {
    await Haptics.selectionAsync();
    router.push(`/(chef)/recipes/${id}`);
  };

  const onEditRecipe = async (id: string) => {
    await Haptics.selectionAsync();
    router.push(`/(chef)/recipes/edit/${id}`);
  };

  const onTogglePublish = async (id: string, current: boolean) => {
    if (!userId) return;

    try {
      setTogglingById((prev) => ({ ...prev, [id]: true }));

      const { error } = await supabase
        .from('recipes')
        .update({ is_published: !current })
        .eq('id', Number(id))
        .eq('user_id', userId);

      if (!error) {
        setRecipes((prev) => prev.map((item) => (item.id === id ? { ...item, is_published: !current } : item)));
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setError('No se pudo actualizar la publicación.');
      }
    } finally {
      setTogglingById((prev) => ({ ...prev, [id]: false }));
    }
  };

  const compactHeaderOpacity = scrollY.interpolate({
    inputRange: [40, 95],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const largeTitleOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const fabBottom = Math.max(insets.bottom + 16, 88);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.compactHeaderWrap, { paddingTop: insets.top, opacity: compactHeaderOpacity }]} pointerEvents="none">
          <BlurView intensity={82} tint={scheme === 'dark' ? 'dark' : 'light'} style={[styles.compactHeaderBlur, { borderBottomColor: colors.separator }]}>
            <Text style={[styles.compactHeaderTitle, { color: colors.label }]}>Mis recetas</Text>
          </BlurView>
        </Animated.View>

        <Animated.FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: 136 + insets.bottom }]}
          ListHeaderComponent={
            <View>
              <Animated.Text style={[styles.title, { color: colors.label, opacity: largeTitleOpacity }]}>Mis recetas</Animated.Text>
              <Text style={[styles.subtitle, { color: colors.secondaryLabel }]}>
                {recipes.length} receta{recipes.length !== 1 ? 's' : ''} · {publishedCount} publicada{publishedCount !== 1 ? 's' : ''}
              </Text>

              <View style={[styles.searchWrap, { backgroundColor: colors.card }]}>
                <Ionicons name="search" size={16} color={colors.secondaryLabel} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Buscar recetas"
                  placeholderTextColor={colors.tertiaryLabel}
                  style={[styles.searchInput, { color: colors.label }]}
                  clearButtonMode="while-editing"
                  returnKeyType="search"
                />
              </View>

              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={FILTERS}
                keyExtractor={(item) => item.key}
                contentContainerStyle={styles.filtersRow}
                renderItem={({ item }) => {
                  const active = item.key === activeFilter;
                  return (
                    <Pressable
                      onPress={async () => {
                        setActiveFilter(item.key);
                        await Haptics.selectionAsync();
                      }}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: active
                            ? colors.primary
                            : colors.card,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: active ? colors.card : colors.label },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            </View>
          }
          renderItem={({ item }) => (
            <RecipeCardChef
              recipe={item}
              onPress={onPressRecipe}
              onEdit={onEditRecipe}
              onTogglePublish={onTogglePublish}
              isToggling={Boolean(togglingById[item.id])}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name={isLoading ? 'hourglass-outline' : error ? 'alert-circle-outline' : 'restaurant-outline'} size={34} color={colors.secondaryLabel} />
              <Text style={[styles.emptyTitle, { color: colors.label }]}>
                {isLoading ? 'Cargando recetas…' : error ? 'Ocurrió un problema' : query.trim() ? 'Sin resultados' : 'Todavía no tenés recetas'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.secondaryLabel }]}>
                {error
                  ? error
                  : query.trim()
                    ? 'Probá otro término o filtro.'
                    : 'Creá tu primera receta para empezar a vender.'}
              </Text>
              {error ? (
                <Pressable
                  onPress={() => void load()}
                  style={({ pressed }) => [styles.retryButton, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}
                >
                  <Text style={[styles.retryButtonText, { color: colors.card }]}>Reintentar</Text>
                </Pressable>
              ) : null}
            </View>
          }
        />

        <Pressable
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(chef)/recipes/new');
          }}
          style={({ pressed }) => [
            styles.fab,
            {
              bottom: fabBottom,
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
            },
            (pressed as boolean) && styles.fabPressed,
          ]}
        >
          <Ionicons name="add" size={20} color={colors.card} />
          <Text style={[styles.fabText, { color: colors.card }]}>Nueva receta</Text>
        </Pressable>
      </SafeAreaView>
    </>
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
    zIndex: 30,
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
  },
  content: {
    paddingHorizontal: 16,
  },
  title: {
    marginTop: 6,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  searchWrap: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    minHeight: 44,
    fontSize: 16,
  },
  filtersRow: {
    marginTop: 12,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 54,
    paddingHorizontal: 22,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 16,
    minHeight: 52,
    borderRadius: 26,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 6,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  fabText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
  },
});
