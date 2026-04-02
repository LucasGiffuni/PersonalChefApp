import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View, useColorScheme } from 'react-native';
import { RecipeForm, RecipeFormData, RecipeFormIngredient } from './_form';
import { supabase } from '../../../lib/supabase';

type RecipeEditData = {
  id: number;
  name: string;
  cat: string | null;
  emoji: string | null;
  description: string | null;
  time: string | null;
  difficulty: string | null;
  servings: number | null;
  photo_url: string | null;
  ingredients: any[] | null;
  steps: string[] | null;
  is_published: boolean | null;
};

async function uploadPhoto(uri: string, recipeId: number): Promise<string | null> {
  try {
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${recipeId}.${ext}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error } = await supabase.storage
      .from('recipe-photos')
      .upload(path, blob, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('recipe-photos').getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

function normalizeDifficulty(value: string | null): RecipeFormData['difficulty'] {
  const v = String(value ?? '').toLowerCase();
  if (v === 'easy' || v === 'facil' || v === 'fácil') return 'easy';
  if (v === 'hard' || v === 'dificil' || v === 'difícil') return 'hard';
  return 'medium';
}

function normalizeIngredients(input: any[] | null): RecipeFormIngredient[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item, index) => {
      if (typeof item === 'string') {
        const name = item.trim();
        if (!name) return null;

        return {
          id: `legacy-${index}`,
          name,
          source: 'manual' as const,
          quantity: 0,
          unit: 'g' as const,
          grams: 0,
        };
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

export default function EditRecipeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipeId = Number(id);
  const colorScheme = useColorScheme();

  const [recipe, setRecipe] = useState<RecipeEditData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!Number.isFinite(recipeId) || recipeId <= 0) {
        if (active) {
          setRecipe(null);
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase
        .from('recipes')
        .select('id,name,cat,emoji,description,time,difficulty,servings,photo_url,ingredients,steps,is_published')
        .eq('id', recipeId)
        .maybeSingle();

      if (!active) return;
      setRecipe((data as RecipeEditData) ?? null);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
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
      photo_url: recipe.photo_url ?? '',
      is_published: !!recipe.is_published,
      ingredients: normalizeIngredients(recipe.ingredients),
      steps: recipe.steps ?? [],
    };
  }, [recipe]);

  const onSave = async (value: RecipeFormData) => {
    if (!recipe) {
      throw new Error('No se encontró la receta para actualizar.');
    }

    let finalPhotoUrl = value.photo_url || null;

    if (value.photoUri) {
      const uploaded = await uploadPhoto(value.photoUri, recipe.id);
      if (uploaded) finalPhotoUrl = uploaded;
    }

    const payload = {
      name: value.name,
      cat: value.cat || null,
      emoji: value.emoji,
      description: value.description || null,
      time: value.time || null,
      difficulty: value.difficulty || null,
      servings: value.servings,
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

    const { error } = await supabase.from('recipes').update(payload).eq('id', recipe.id);
    if (error) {
      Alert.alert('No se pudo actualizar', error.message);
      throw error;
    }

    router.replace('/(chef)/recipes');
  };

  const onCancel = () => router.back();

  if (!loading && !recipe) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f2f2f7',
          paddingHorizontal: 24,
        }}
      >
        <Text style={{ color: colorScheme === 'dark' ? '#ffffff' : '#000000', fontSize: 16, fontWeight: '600' }}>
          Receta no encontrada
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: '#007AFF', fontSize: 16 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  if (loading || !initialValues) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f2f2f7',
        }}
      >
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return <RecipeForm initialValues={initialValues} onSave={onSave} onCancel={onCancel} />;
}
