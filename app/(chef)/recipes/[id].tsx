import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { RecipeForm, RecipeFormData, RecipeFormIngredient } from './_form';
import { uploadRecipePhoto } from '../../../lib/services/recipePhotos';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/stores/authStore';
import { useTheme } from '../../../lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type RecipeEditData = {
  id: number;
  name: string;
  cat: string | null;
  emoji: string | null;
  description: string | null;
  time: string | null;
  difficulty: string | null;
  servings: number | null;
  base_price?: number | null;
  photo_url: string | null;
  ingredients: any[] | null;
  steps: string[] | null;
  is_published: boolean | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

function normalizeDifficulty(value: string | null): RecipeFormData['difficulty'] {
  const v = String(value ?? '').toLowerCase();
  if (v === 'easy' || v === 'facil' || v === 'fácil' || v === 'baja') return 'easy';
  if (v === 'hard' || v === 'dificil' || v === 'difícil' || v === 'alta') return 'hard';
  return 'medium';
}

function normalizeIngredients(input: any[] | null): RecipeFormIngredient[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, index) => {
      if (typeof item === 'string') {
        const name = item.trim();
        if (!name) return null;
        return { id: `legacy-${index}`, name, source: 'manual' as const, quantity: 0, unit: 'g' as const, grams: 0 };
      }
      const name = String(item?.name ?? '').trim();
      if (!name) return null;
      return {
        id: String(item?.id ?? `legacy-${index}`),
        name,
        source: (item?.source as RecipeFormIngredient['source']) ?? 'manual',
        catalogIngredientId: item?.catalogIngredientId
          ? String(item.catalogIngredientId)
          : item?.ingredient_id
            ? String(item.ingredient_id)
            : undefined,
        fdcId: Number(item?.fdc_id ?? item?.fdcId) || undefined,
        quantity: Number(item?.quantity ?? 0),
        unit: (item?.unit as RecipeFormIngredient['unit']) ?? 'g',
        grams: Number(item?.grams ?? 0),
        caloriesPer100g: Number(item?.caloriesPer100g ?? item?.calories_per_100g) || undefined,
        proteinPer100g: Number(item?.proteinPer100g ?? item?.protein_per_100g) || undefined,
        fatPer100g: Number(item?.fatPer100g ?? item?.fat_per_100g) || undefined,
        carbsPer100g: Number(item?.carbsPer100g ?? item?.carbs_per_100g) || undefined,
        pricePer100g: Number(item?.pricePer100g ?? item?.price_per_100g) || undefined,
      };
    })
    .filter(Boolean) as RecipeFormIngredient[];
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EditRecipeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipeId = Number(id);

  const [recipe, setRecipe] = useState<RecipeEditData | null>(null);
  const [loading, setLoading] = useState(true);

  const onCancel = () => router.replace('/(chef)/recipes');

  useEffect(() => {
    let active = true;
    const load = async () => {
      console.log('[EDIT] load → recipeId:', recipeId);
      if (!Number.isFinite(recipeId) || recipeId <= 0) {
        console.warn('[EDIT] load → invalid recipeId, aborting');
        if (active) { setRecipe(null); setLoading(false); }
        return;
      }
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select('id,name,cat,emoji,description,time,difficulty,servings,photo_url,ingredients,steps,is_published')
          .eq('id', recipeId)
          .maybeSingle();
        if (!active) return;
        if (error) {
          console.warn('[EDIT] load → supabase error:', error.message);
          setRecipe(null);
        } else {
          console.log('[EDIT] load → got recipe:', data ? `id=${(data as any).id}` : 'null');
          setRecipe((data as RecipeEditData) ?? null);
        }
      } catch (err: any) {
        console.error('[EDIT] load → unexpected error:', err?.message ?? err);
        if (active) setRecipe(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [recipeId]);

  const initialValues = useMemo<Partial<RecipeFormData> | undefined>(() => {
    if (!recipe) return undefined;
    return {
      name: recipe.name,
      cat: recipe.cat ?? 'Principal',
      emoji: recipe.emoji ?? '🍽️',
      description: recipe.description ?? '',
      time: recipe.time ?? '',
      difficulty: normalizeDifficulty(recipe.difficulty),
      servings: recipe.servings ?? 4,
      base_price: Number((recipe as any).base_price ?? 0) || 0,
      photo_url: recipe.photo_url ?? '',
      is_published: !!recipe.is_published,
      ingredients: normalizeIngredients(recipe.ingredients),
      steps: recipe.steps ?? [],
    };
  }, [recipe]);

  const onSave = async (value: RecipeFormData) => {
    if (!recipe) throw new Error('No se encontró la receta para actualizar.');
    if (!userId) throw new Error('Tu sesión expiró. Iniciá sesión nuevamente.');

    let finalPhotoUrl = value.photo_url || null;
    if (value.photoUri) {
      finalPhotoUrl = await uploadRecipePhoto({
        uri: value.photoUri,
        recipeId: recipe.id,
        userId,
      });
    }

    const payload = {
      name: value.name,
      cat: value.cat || null,
      emoji: value.emoji,
      description: value.description || null,
      time: value.time || null,
      difficulty: value.difficulty || null,
      servings: value.servings,
      base_price: Number(value.base_price) || 0,
      photo_url: finalPhotoUrl,
      ingredients: value.ingredients.map((item) => ({
        id: item.id,
        name: item.name,
        source: item.source,
        ingredient_id: item.catalogIngredientId ? Number(item.catalogIngredientId) : null,
        fdc_id: item.fdcId ?? null,
        quantity: item.quantity,
        unit: item.unit,
        grams: item.grams,
        calories_per_100g: item.caloriesPer100g ?? null,
        protein_per_100g: item.proteinPer100g ?? null,
        fat_per_100g: item.fatPer100g ?? null,
        carbs_per_100g: item.carbsPer100g ?? null,
        price_per_100g: item.pricePer100g ?? null,
      })),
      steps: value.steps,
      is_published: value.is_published,
    };

    let { error } = await supabase.from('recipes').update(payload).eq('id', recipe.id);
    if (error && String(error.message ?? '').toLowerCase().includes('base_price')) {
      const fallbackPayload = { ...payload } as any;
      delete fallbackPayload.base_price;
      const fallbackResult = await supabase.from('recipes').update(fallbackPayload).eq('id', recipe.id);
      error = fallbackResult.error;
    }

    if (error) {
      Alert.alert('No se pudo actualizar', error.message);
      throw error;
    }

    router.replace('/(chef)/recipes');
  };

  // ── Estado: cargando ──
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Pressable onPress={onCancel} style={{ marginTop: 14 }} hitSlop={8}>
            <Text style={{ color: colors.primary, fontSize: 16 }}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Estado: no encontrada ──
  if (!recipe || !initialValues) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, paddingHorizontal: 24 }}>
        <Text style={{ color: colors.label, fontSize: 16, fontWeight: '600' }}>Receta no encontrada</Text>
        <Pressable onPress={onCancel} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  // ── Estado: formulario ──
  return <RecipeForm initialValues={initialValues} onSave={onSave} onCancel={onCancel} />;
}
