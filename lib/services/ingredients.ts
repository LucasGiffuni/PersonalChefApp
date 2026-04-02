import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { IngredientCatalogItem, IngredientPriceItem } from '../types';

const CATALOG_CACHE_KEY = 'ingredients_catalog_cache_v1';

interface USDAFood {
  fdcId: number;
  description: string;
}

interface USDANutrientSummary {
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
}

export async function fetchIngredients() {
  const catalogResult = await supabase
    .from('ingredients_catalog')
    .select('*')
    .order('name', { ascending: true });

  // Optional table: only query ingredient_prices if explicitly enabled.
  const enableIngredientPrices = process.env.EXPO_PUBLIC_ENABLE_INGREDIENT_PRICES === 'true';
  let normalizedPrices: IngredientPriceItem[] = [];
  let pricesError: any = null;

  if (enableIngredientPrices) {
    const pricesResult = await supabase.from('ingredient_prices').select('*');
    pricesError = pricesResult.error;
    normalizedPrices = (pricesResult.data ?? []) as IngredientPriceItem[];
  }

  if (catalogResult.error || pricesError) {
    const cached = await AsyncStorage.getItem(CATALOG_CACHE_KEY);
    if (cached) return JSON.parse(cached) as { catalog: IngredientCatalogItem[]; prices: IngredientPriceItem[] };
    throw catalogResult.error ?? pricesError;
  }

  const payload = {
    catalog: (catalogResult.data ?? []) as IngredientCatalogItem[],
    prices: normalizedPrices as IngredientPriceItem[],
  };

  await AsyncStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(payload));
  return payload;
}

export async function searchUsdaIngredients(query: string): Promise<USDAFood[]> {
  const apiKey = process.env.EXPO_PUBLIC_USDA_API_KEY;
  if (!apiKey || query.trim().length < 2) return [];

  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();
  return (data.foods ?? []).map((item: any) => ({
    fdcId: item.fdcId,
    description: item.description,
  }));
}

function pickNutrient(food: any, nutrientNames: string[]) {
  const nutrients = Array.isArray(food?.foodNutrients) ? food.foodNutrients : [];
  const normalizedTargets = nutrientNames.map((item) => item.toLowerCase());
  const hit = nutrients.find((entry: any) => normalizedTargets.includes(String(entry?.nutrientName ?? '').toLowerCase()));
  return Number(hit?.value ?? 0) || 0;
}

export async function fetchUsdaFoodNutrition(fdcId: number): Promise<USDANutrientSummary | null> {
  const apiKey = process.env.EXPO_PUBLIC_USDA_API_KEY;
  if (!apiKey || !Number.isFinite(fdcId)) return null;

  const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const food = await response.json();
  return {
    caloriesPer100g: pickNutrient(food, ['Energy']),
    proteinPer100g: pickNutrient(food, ['Protein']),
    fatPer100g: pickNutrient(food, ['Total lipid (fat)']),
    carbsPer100g: pickNutrient(food, ['Carbohydrate, by difference']),
  };
}
