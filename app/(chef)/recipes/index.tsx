import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuthStore } from '../../../lib/stores/authStore';
import { fetchRecipes } from '../../../lib/services/recipes';
import { Recipe } from '../../../lib/types';

export default function ChefRecipesScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user?.id);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');

  const load = useCallback(async () => {
    if (!userId) { setRecipes([]); return; }
    try {
      const data = await fetchRecipes(userId);
      setRecipes(data);
    } catch {
      setRecipes([]);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => { void load(); }, [load])
  );

  const categories = useMemo(() => {
    const fromRecipes = Array.from(new Set(recipes.map((r) => r.category).filter(Boolean)));
    return ['Todas', ...fromRecipes];
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return recipes.filter((recipe) => {
      const categoryMatch = activeCategory === 'Todas' || recipe.category === activeCategory;
      const textMatch = !normalized || recipe.title.toLowerCase().includes(normalized);
      return categoryMatch && textMatch;
    });
  }, [activeCategory, query, recipes]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* ── Header ── */}
          <Text style={s.title}>Mis recetas</Text>
          <Text style={s.subtitle}>
            {recipes.length} receta{recipes.length !== 1 ? 's' : ''} · {recipes.filter((r) => r.is_published).length} publicada{recipes.filter((r) => r.is_published).length !== 1 ? 's' : ''}
          </Text>

          {/* ── Botón nueva receta ── */}
          <Pressable style={s.newButton} onPress={() => router.push('/(chef)/recipes/new')}>
            <Text style={s.newButtonText}>+ Nueva receta</Text>
          </Pressable>

          {/* ── Buscador ── */}
          <View style={s.searchWrap}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar recetas..."
              placeholderTextColor="rgba(60,60,67,0.3)"
              style={s.search}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
          </View>

          {/* ── Filtros de categoría ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.categoriesRow}
          >
            {categories.map((category) => {
              const active = category === activeCategory;
              return (
                <Pressable
                  key={category}
                  style={[s.categoryChip, active && s.categoryChipActive]}
                  onPress={() => setActiveCategory(category)}
                >
                  <Text style={[s.categoryChipText, active && s.categoryChipTextActive]}>
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── Lista vacía ── */}
          {filteredRecipes.length === 0 && (
            <View style={s.emptyWrap}>
              <Text style={s.emptyEmoji}>🍽️</Text>
              <Text style={s.emptyTitle}>
                {query.trim() ? 'Sin resultados' : 'Todavía no tenés recetas'}
              </Text>
              <Text style={s.emptySubtitle}>
                {query.trim() ? 'Probá con otro nombre o categoría.' : 'Creá tu primera receta con el botón de arriba.'}
              </Text>
            </View>
          )}

          {/* ── Cards de recetas ── */}
          {filteredRecipes.map((recipe) => (
            <Pressable
              key={recipe.id}
              style={s.recipeCard}
              onPress={() => router.push(`/(chef)/recipes/${recipe.id}`)}
            >
              {recipe.image_url ? (
                <Image source={{ uri: recipe.image_url }} style={s.recipeImage} />
              ) : (
                <View style={s.recipeImageFallback}>
                  <Text style={s.recipeEmoji}>🍽️</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.recipeTitle} numberOfLines={1}>{recipe.title}</Text>
                {recipe.category ? <Text style={s.recipeMeta}>{recipe.category}</Text> : null}
                {recipe.is_published && (
                  <View style={s.publishedBadge}>
                    <Text style={s.publishedBadgeText}>Publicada</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}

        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    paddingTop: 10,
  },

  // Header
  title: {
    marginTop: 8,
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.4,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: 'rgba(60,60,67,0.6)',
  },

  // Botón nueva receta
  newButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Buscador
  searchWrap: {
    marginTop: 14,
  },
  search: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#000000',
  },

  // Filtros de categoría
  categoriesRow: {
    gap: 8,
    marginTop: 12,
    paddingRight: 4,
  },
  categoryChip: {
    minHeight: 34,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60,60,67,0.29)',
  },
  categoryChipActive: {
    backgroundColor: '#007AFF',
    borderWidth: 0,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },

  // Estado vacío
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: 'rgba(60,60,67,0.6)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Cards de recetas
  recipeCard: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recipeImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  recipeImageFallback: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#f2f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeEmoji: {
    fontSize: 28,
  },
  recipeTitle: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  recipeMeta: {
    marginTop: 3,
    color: 'rgba(60,60,67,0.6)',
    fontSize: 13,
  },
  publishedBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: 'rgba(52,199,89,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  publishedBadgeText: {
    color: '#34C759',
    fontSize: 11,
    fontWeight: '700',
  },
});
