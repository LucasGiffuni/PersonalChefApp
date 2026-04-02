export type Difficulty = 'easy' | 'medium' | 'hard';

export interface IngredientItem {
  id: string;
  name: string;
  catalogIngredientId?: string;
  quantity?: number;
  grams: number;
  unit?: string;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  fatPer100g?: number;
  carbsPer100g?: number;
  pricePer100g?: number;
}

export interface NutritionSummary {
  totalCalories: number;
  caloriesPerServing: number;
  totalProtein: number;
  proteinPerServing: number;
  totalFat: number;
  fatPerServing: number;
  totalCarbs: number;
  carbsPerServing: number;
}

export interface CostSummary {
  totalCost: number;
  costPerServing: number;
}

export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  image_url?: string;
  servings: number;
  prep_time_minutes: number;
  difficulty: Difficulty;
  category: string;
  ingredients: IngredientItem[];
  steps: string[];
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IngredientCatalogItem {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g?: number;
  fat_per_100g?: number;
  carbs_per_100g?: number;
  default_unit?: string;
  display_name?: string;
}

export interface IngredientPriceItem {
  ingredient_id: string;
  price_per_100g: number;
}

export interface RecipeMetrics {
  nutrition: NutritionSummary;
  cost: CostSummary;
}
