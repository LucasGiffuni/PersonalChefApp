import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { Recipe } from '../types';

const RECIPES_CACHE_KEY = 'recipes_cache_v1';

function normalizeRecipe(raw: any): Recipe {
  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients.map((ingredient: any, index: number) => ({
        id: String(ingredient.id ?? `${raw.id}-${index}`),
        name: ingredient.name ?? '',
        catalogIngredientId: ingredient.catalogIngredientId
          ? String(ingredient.catalogIngredientId)
          : ingredient.ingredient_id
            ? String(ingredient.ingredient_id)
            : undefined,
        quantity: Number(ingredient.quantity ?? 0),
        grams: Number(ingredient.grams ?? 0),
        unit: ingredient.unit,
        caloriesPer100g: toNumberOrUndefined(ingredient.caloriesPer100g ?? ingredient.calories_per_100g),
        proteinPer100g: toNumberOrUndefined(ingredient.proteinPer100g ?? ingredient.protein_per_100g),
        fatPer100g: toNumberOrUndefined(ingredient.fatPer100g ?? ingredient.fat_per_100g),
        carbsPer100g: toNumberOrUndefined(ingredient.carbsPer100g ?? ingredient.carbs_per_100g),
        pricePer100g: toNumberOrUndefined(ingredient.pricePer100g ?? ingredient.price_per_100g),
      }))
    : [];

  const prepTime =
    typeof raw.prep_time_minutes === 'number'
      ? raw.prep_time_minutes
      : parseMinutesFromLegacyTime(raw.time);

  return {
    id: String(raw.id),
    user_id: raw.user_id,
    title: raw.title ?? raw.name ?? 'Untitled recipe',
    description: raw.description ?? '',
    image_url: raw.image_url ?? raw.photo_url ?? '',
    servings: Number(raw.servings ?? 1),
    prep_time_minutes: prepTime,
    difficulty: normalizeDifficulty(raw.difficulty),
    category: raw.category ?? raw.cat ?? 'General',
    ingredients,
    steps: Array.isArray(raw.steps) ? raw.steps.map((s: any) => String(s)) : [],
    is_published: Boolean(raw.is_published ?? false),
    created_at: raw.created_at,
    updated_at: raw.updated_at ?? raw.created_at,
  } as Recipe;
}

export async function fetchRecipes(userId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    const cached = await AsyncStorage.getItem(`${RECIPES_CACHE_KEY}:${userId}`);
    if (cached) return JSON.parse(cached);
    throw error;
  }

  const recipes = (data ?? []).map(normalizeRecipe);
  await AsyncStorage.setItem(`${RECIPES_CACHE_KEY}:${userId}`, JSON.stringify(recipes));
  return recipes;
}

export async function upsertRecipe(recipe: Partial<Recipe> & { user_id: string }) {
  const numericId = recipe.id ? Number(recipe.id) : undefined;
  const normalizedIngredients = (recipe.ingredients ?? []).map((ingredient) => ({
    ...ingredient,
    ...(ingredient.catalogIngredientId ? { ingredient_id: Number(ingredient.catalogIngredientId) } : {}),
  }));
  const legacyPayload = {
    user_id: recipe.user_id,
    name: recipe.title ?? '',
    cat: recipe.category ?? 'General',
    description: recipe.description ?? '',
    time: `${recipe.prep_time_minutes ?? 0} min`,
    difficulty: recipe.difficulty ?? 'medium',
    servings: recipe.servings ?? 1,
    ingredients: normalizedIngredients,
    steps: recipe.steps ?? [],
    photo_url: recipe.image_url ?? '',
  };

  const payload = {
    ...legacyPayload,
    ...(Number.isFinite(numericId) ? { id: numericId } : {}),
  };

  const { data, error } = await supabase
    .from('recipes')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return normalizeRecipe(data);
}

export async function deleteRecipe(recipeId: string) {
  const { error } = await supabase.from('recipes').delete().eq('id', Number(recipeId));
  if (error) throw error;
}

function parseMinutesFromLegacyTime(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const matched = value.match(/\d+/);
  return matched ? Number(matched[0]) : 0;
}

function normalizeDifficulty(value: unknown): Recipe['difficulty'] {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'easy' || normalized === 'facil' || normalized === 'fácil') return 'easy';
  if (normalized === 'hard' || normalized === 'dificil' || normalized === 'difícil') return 'hard';
  return 'medium';
}

function toNumberOrUndefined(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
