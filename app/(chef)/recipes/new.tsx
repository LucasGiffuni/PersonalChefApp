import { useRouter } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';
import { RecipeForm, RecipeFormData } from './_form';
import { uploadRecipePhoto } from '../../../lib/services/recipePhotos';
import { useAuthStore } from '../../../lib/stores/authStore';
import { supabase } from '../../../lib/supabase';

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
      base_price: Number(value.base_price) || 0,
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

    let inserted: { id: number } | null = null;
    let error: any = null;

    const firstTry = await supabase
      .from('recipes')
      .insert(payload)
      .select('id')
      .single();

    inserted = firstTry.data as any;
    error = firstTry.error;

    if (error && String(error.message ?? '').toLowerCase().includes('base_price')) {
      const fallbackPayload = { ...payload } as any;
      delete fallbackPayload.base_price;
      const secondTry = await supabase.from('recipes').insert(fallbackPayload).select('id').single();
      inserted = secondTry.data as any;
      error = secondTry.error;
    }

    if (error) {
      Alert.alert('No se pudo guardar', error.message);
      throw error;
    }

    if (value.photoUri && inserted?.id) {
      const publicUrl = await uploadRecipePhoto({
        uri: value.photoUri,
        recipeId: inserted.id,
        userId,
      });

      const { error: photoUpdateError } = await supabase
        .from('recipes')
        .update({ photo_url: publicUrl })
        .eq('id', inserted.id);

      if (photoUpdateError) {
        Alert.alert('Foto no actualizada', photoUpdateError.message);
      }
    }

    router.replace('/(chef)/recipes');
  };

  const onCancel = () => router.replace('/(chef)/recipes');

  return <RecipeForm onSave={onSave} onCancel={onCancel} />;
}
