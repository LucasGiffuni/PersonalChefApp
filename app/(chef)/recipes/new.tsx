import { useRouter } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';
import { RecipeForm, RecipeFormData } from './_form';
import { useAuthStore } from '../../../lib/stores/authStore';
import { supabase } from '../../../lib/supabase';

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

export default function NewRecipeScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user?.id);

  const onSave = async (value: RecipeFormData) => {
    if (!userId) {
      throw new Error('Tu sesión expiró. Iniciá sesión nuevamente.');
    }

    const payload = {
      user_id: userId,
      name: value.name,
      cat: value.cat || null,
      emoji: value.emoji,
      description: value.description || null,
      time: value.time || null,
      difficulty: value.difficulty || null,
      servings: value.servings,
      photo_url: value.photo_url || null,
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

    const { data: inserted, error } = await supabase
      .from('recipes')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      Alert.alert('No se pudo guardar', error.message);
      throw error;
    }

    if (value.photoUri && inserted?.id) {
      const publicUrl = await uploadPhoto(value.photoUri, inserted.id);
      if (publicUrl) {
        await supabase.from('recipes').update({ photo_url: publicUrl }).eq('id', inserted.id);
      }
    }

    router.replace('/(chef)/recipes');
  };

  const onCancel = () => router.back();

  return <RecipeForm onSave={onSave} onCancel={onCancel} />;
}
