import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import {
  RecipeForm,
  RecipeFormIngredient,
  RecipeFormValue,
} from '../../../../lib/components/chef/RecipeForm';
import { supabase } from '../../../../lib/supabase';

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

function normalizeDifficulty(value: string | null): RecipeFormValue['difficulty'] {
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
        return name ? { id: `legacy-${index}`, name, source: 'manual' as const, quantity: 0, unit: 'g' as const, grams: 0 } : null;
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
  const [recipe, setRecipe] = useState<RecipeEditData | null>(null);

  useEffect(() => {
    if (!recipeId) return;
    supabase
      .from('recipes')
      .select('id,name,cat,emoji,description,time,difficulty,servings,photo_url,ingredients,steps,is_published')
      .eq('id', recipeId)
      .maybeSingle()
      .then(({ data }) => setRecipe((data as RecipeEditData) ?? null));
  }, [recipeId]);

  if (!recipe) {
    return <View style={{ flex: 1 }} />;
  }

  const onSave = async (value: RecipeFormValue) => {
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
    router.replace(`/(chef)/recipes/${recipe.id}`);
  };

  const onCancel = () => router.back();

  return (
    <RecipeForm
      title="Editar receta"
      onSave={onSave}
      onCancel={onCancel}
      initialValue={{
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
      }}
    />
  );
}
