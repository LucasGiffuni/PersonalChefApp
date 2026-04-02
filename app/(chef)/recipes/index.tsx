import { useFocusEffect, useRouter } from 'expo-router';
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
    if (!userId) {
      setRecipes([]);
      return;
    }

    try {
      const data = await fetchRecipes(userId);
      setRecipes(data);
    } catch {
      setRecipes([]);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
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
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>Chef</Text>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Tus recetas, categorías y publicación para consumidores.</Text>

        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{recipes.length}</Text>
              <Text style={styles.statLabel}>Recetas</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{recipes.filter((item) => item.is_published).length}</Text>
              <Text style={styles.statLabel}>Publicadas</Text>
            </View>
          </View>
          <Pressable style={styles.newButton} onPress={() => router.push('/(chef)/recipes/new')}>
            <Text style={styles.newButtonText}>Nueva receta</Text>
          </Pressable>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar recetas"
          placeholderTextColor="#9CA3AF"
          style={styles.search}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
          {categories.map((category) => {
            const active = category === activeCategory;
            return (
              <Pressable
                key={category}
                style={[styles.categoryChip, active ? styles.categoryChipActive : null]}
                onPress={() => setActiveCategory(category)}
              >
                <Text style={[styles.categoryChipText, active ? styles.categoryChipTextActive : null]}>{category}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {!filteredRecipes.length ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyText}>No hay recetas para mostrar.</Text>
          </View>
        ) : null}

        {filteredRecipes.map((recipe) => (
          <Pressable key={recipe.id} style={styles.recipeCard} onPress={() => router.push(`/(chef)/recipes/${recipe.id}`)}>
            {recipe.image_url ? (
              <Image source={{ uri: recipe.image_url }} style={styles.recipeImage} />
            ) : (
              <View style={styles.recipeImageFallback}>
                <Text style={styles.recipeEmoji}>🍽️</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.recipeTitle} numberOfLines={1}>
                {recipe.title}
              </Text>
              <Text style={styles.recipeMeta}>{recipe.category}</Text>
              {recipe.is_published ? (
                <View style={styles.publishedBadge}>
                  <Text style={styles.publishedBadgeText}>Publicada</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 10 },
  kicker: { fontSize: 12, fontWeight: '700', color: '#007AFF', textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { marginTop: 6, fontSize: 34, fontWeight: '700', color: '#111111' },
  subtitle: { marginTop: 4, fontSize: 14, color: '#6B7280' },
  statsCard: { marginTop: 14, marginBottom: 12, borderRadius: 14, backgroundColor: '#FFFFFF', padding: 14 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statItem: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#111111' },
  statLabel: { marginTop: 2, fontSize: 12, color: '#6B7280' },
  newButton: {
    marginTop: 12,
    backgroundColor: '#007AFF',
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  search: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111111',
  },
  categoriesRow: { gap: 8, marginTop: 10, paddingRight: 10 },
  categoryChip: { minHeight: 36, borderRadius: 999, backgroundColor: '#FFFFFF', paddingHorizontal: 12, justifyContent: 'center' },
  categoryChipActive: { backgroundColor: '#007AFF' },
  categoryChipText: { color: '#374151', fontWeight: '600' },
  categoryChipTextActive: { color: '#FFFFFF' },
  recipeCard: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recipeImage: { width: 64, height: 64, borderRadius: 10 },
  recipeImageFallback: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  recipeEmoji: { fontSize: 28 },
  recipeTitle: { color: '#111111', fontSize: 16, fontWeight: '700' },
  recipeMeta: { marginTop: 3, color: '#6B7280', fontSize: 12 },
  publishedBadge: { marginTop: 6, alignSelf: 'flex-start', borderRadius: 10, backgroundColor: 'rgba(52,199,89,0.15)', minHeight: 20, paddingHorizontal: 8, justifyContent: 'center' },
  publishedBadgeText: { color: '#34C759', fontSize: 11, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28 },
  emptyEmoji: { fontSize: 34 },
  emptyText: { marginTop: 8, fontSize: 14, color: '#6B7280' },
});
