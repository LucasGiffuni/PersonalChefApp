export type IngredientUnit = 'g' | 'kg' | 'ml' | 'l' | 'tsp' | 'tbsp' | 'cup' | 'unit';

const UNIT_TO_ML: Partial<Record<IngredientUnit, number>> = {
  ml: 1,
  l: 1000,
  tsp: 5,
  tbsp: 15,
  cup: 240,
};

const DENSITY_HINTS: Array<{ keywords: string[]; gPerMl: number }> = [
  { keywords: ['olive oil', 'oil', 'aceite'], gPerMl: 0.92 },
  { keywords: ['honey', 'miel'], gPerMl: 1.42 },
  { keywords: ['flour', 'harina'], gPerMl: 0.53 },
  { keywords: ['sugar', 'azucar', 'azúcar'], gPerMl: 0.85 },
  { keywords: ['milk', 'leche'], gPerMl: 1.03 },
  { keywords: ['water', 'agua'], gPerMl: 1.0 },
];

const PIECE_WEIGHT_HINTS: Array<{ keywords: string[]; grams: number }> = [
  { keywords: ['egg', 'huevo'], grams: 50 },
  { keywords: ['garlic', 'ajo'], grams: 5 },
  { keywords: ['onion', 'cebolla'], grams: 110 },
  { keywords: ['tomato', 'tomate'], grams: 120 },
  { keywords: ['banana', 'banana', 'plátano', 'platano'], grams: 120 },
  { keywords: ['apple', 'manzana'], grams: 180 },
];

export const UNIT_LABELS: Record<IngredientUnit, string> = {
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'L',
  tsp: 'tsp',
  tbsp: 'tbsp',
  cup: 'cup',
  unit: 'unit',
};

export const UNIT_OPTIONS: IngredientUnit[] = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'unit'];

export function toGrams(quantity: number, unit: IngredientUnit, ingredientName: string): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;

  if (unit === 'g') return quantity;
  if (unit === 'kg') return quantity * 1000;
  if (unit === 'unit') return quantity * estimatePieceWeight(ingredientName);

  const ml = UNIT_TO_ML[unit] ?? 0;
  const density = estimateDensity(ingredientName);
  return quantity * ml * density;
}

function estimateDensity(ingredientName: string): number {
  const normalized = normalize(ingredientName);
  for (const hint of DENSITY_HINTS) {
    if (hint.keywords.some((keyword) => normalized.includes(keyword))) {
      return hint.gPerMl;
    }
  }
  return 1;
}

function estimatePieceWeight(ingredientName: string): number {
  const normalized = normalize(ingredientName);
  for (const hint of PIECE_WEIGHT_HINTS) {
    if (hint.keywords.some((keyword) => normalized.includes(keyword))) {
      return hint.grams;
    }
  }
  return 100;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
