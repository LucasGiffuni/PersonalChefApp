import { CostSummary, IngredientItem, NutritionSummary, Recipe } from '../types';

export function scaleIngredients(ingredients: IngredientItem[], fromServings: number, toServings: number): IngredientItem[] {
  if (fromServings <= 0 || toServings <= 0) return ingredients;
  const factor = toServings / fromServings;
  return ingredients.map((ingredient) => ({
    ...ingredient,
    grams: Number((ingredient.grams * factor).toFixed(1)),
  }));
}

export function calculateNutrition(recipe: Recipe, servings = recipe.servings): NutritionSummary {
  const totals = recipe.ingredients.reduce(
    (acc, ingredient) => {
      const gramsFactor = Number(ingredient.grams ?? 0) / 100;
      acc.calories += gramsFactor * Number(ingredient.caloriesPer100g ?? 0);
      acc.protein += gramsFactor * Number(ingredient.proteinPer100g ?? 0);
      acc.fat += gramsFactor * Number(ingredient.fatPer100g ?? 0);
      acc.carbs += gramsFactor * Number(ingredient.carbsPer100g ?? 0);
      return acc;
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
  const safeServings = Math.max(servings, 1);

  return {
    totalCalories: Number(totals.calories.toFixed(1)),
    caloriesPerServing: Number((totals.calories / safeServings).toFixed(1)),
    totalProtein: Number(totals.protein.toFixed(1)),
    proteinPerServing: Number((totals.protein / safeServings).toFixed(1)),
    totalFat: Number(totals.fat.toFixed(1)),
    fatPerServing: Number((totals.fat / safeServings).toFixed(1)),
    totalCarbs: Number(totals.carbs.toFixed(1)),
    carbsPerServing: Number((totals.carbs / safeServings).toFixed(1)),
  };
}

export function calculateCost(recipe: Recipe, servings = recipe.servings): CostSummary {
  const totalCost = recipe.ingredients.reduce((acc, ingredient) => {
    const price = ingredient.pricePer100g ?? 0;
    return acc + (ingredient.grams / 100) * price;
  }, 0);

  return {
    totalCost: Number(totalCost.toFixed(2)),
    costPerServing: Number((totalCost / Math.max(servings, 1)).toFixed(2)),
  };
}

type NutritionIngredientLike = {
  grams?: number;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  fatPer100g?: number;
  carbsPer100g?: number;
};

export function computeNutrition(ingredients: NutritionIngredientLike[], servings: number) {
  const totals = ingredients.reduce(
    (acc, item) => {
      const factor = Number(item.grams ?? 0) / 100;
      acc.calories += factor * Number(item.caloriesPer100g ?? 0);
      acc.protein += factor * Number(item.proteinPer100g ?? 0);
      acc.fat += factor * Number(item.fatPer100g ?? 0);
      acc.carbs += factor * Number(item.carbsPer100g ?? 0);
      return acc;
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const safeServings = Math.max(Number(servings) || 1, 1);
  return {
    calories: totals.calories / safeServings,
    protein: totals.protein / safeServings,
    fat: totals.fat / safeServings,
    carbs: totals.carbs / safeServings,
  };
}
