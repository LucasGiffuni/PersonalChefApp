import { IngredientCatalogItem, IngredientPriceItem, Recipe } from '../types';

export function enrichRecipesWithCatalog(
  recipes: Recipe[],
  catalog: IngredientCatalogItem[],
  prices: IngredientPriceItem[]
): Recipe[] {
  const catalogByName = new Map<string, IngredientCatalogItem>();
  const catalogById = new Map(catalog.map((item) => [String(item.id), item]));
  for (const item of catalog) {
    catalogByName.set(normalize(item.name), item);
    if (item.display_name) {
      catalogByName.set(normalize(item.display_name), item);
    }
  }
  const priceByIngredientId = new Map(prices.map((item) => [String(item.ingredient_id), item.price_per_100g]));

  return recipes.map((recipe) => ({
    ...recipe,
    ingredients: recipe.ingredients.map((ingredient) => {
      const matchedCatalog =
        (ingredient.catalogIngredientId ? catalogById.get(String(ingredient.catalogIngredientId)) : undefined) ??
        catalogByName.get(normalize(ingredient.name));
      if (!matchedCatalog) return ingredient;

      return {
        ...ingredient,
        catalogIngredientId: ingredient.catalogIngredientId ?? String(matchedCatalog.id),
        caloriesPer100g: ingredient.caloriesPer100g ?? matchedCatalog.calories_per_100g,
        proteinPer100g: ingredient.proteinPer100g ?? Number(matchedCatalog.protein_per_100g ?? 0),
        fatPer100g: ingredient.fatPer100g ?? Number(matchedCatalog.fat_per_100g ?? 0),
        carbsPer100g: ingredient.carbsPer100g ?? Number(matchedCatalog.carbs_per_100g ?? 0),
        pricePer100g: ingredient.pricePer100g ?? priceByIngredientId.get(String(matchedCatalog.id)) ?? 0,
      };
    }),
  }));
}

function normalize(value: string) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
