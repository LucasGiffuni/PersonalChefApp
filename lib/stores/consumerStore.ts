import { create } from 'zustand';
import { supabase } from '../supabase';

export type Recipe = {
  id: number;
  name: string;
  cat: string | null;
  emoji: string | null;
  photo_url: string | null;
  time: string | null;
  difficulty: string | null;
  ingredients: any[] | null;
  steps: string[] | null;
  is_published: boolean | null;
};

export type WeeklyPlan = {
  id: number;
  consumer_id: string;
  chef_id: string;
  week_start: string;
  created_at: string;
};

export type PlanItem = {
  id: number;
  plan_id: number;
  recipe_id: number;
  servings: number;
  days: string[];
  notes: string | null;
  created_at: string;
};

export type PlanItemWithRecipe = PlanItem & {
  recipe: Recipe | null;
};

type Direction = 'prev' | 'next';

type ConsumerStore = {
  chefId: string | null;
  chefName: string | null;
  linkedAt: string | null;
  recipes: Recipe[];
  favorites: Recipe[];
  favoriteRecipeIds: number[];
  currentPlan: WeeklyPlan | null;
  planItems: PlanItemWithRecipe[];
  selectedWeekStart: Date;
  initialize: (consumerId: string) => Promise<void>;
  fetchChefRecipes: (chefId: string) => Promise<void>;
  fetchFavorites: () => Promise<void>;
  toggleFavorite: (recipeId: number) => Promise<'added' | 'removed' | 'error'>;
  fetchOrCreatePlan: (weekStart: Date) => Promise<void>;
  fetchPlanItems: (planId: number) => Promise<void>;
  upsertPlanItem: (recipeId: number, servings: number, days: string[]) => Promise<void>;
  removePlanItem: (id: number) => Promise<void>;
  navigateWeek: (direction: Direction) => Promise<void>;
  clear: () => void;
};

function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

const initialWeek = startOfWeekMonday(new Date());

export const useConsumerStore = create<ConsumerStore>((set, get) => ({
  chefId: null,
  chefName: null,
  linkedAt: null,
  recipes: [],
  favorites: [],
  favoriteRecipeIds: [],
  currentPlan: null,
  planItems: [],
  selectedWeekStart: initialWeek,

  clear: () => {
    set({
      chefId: null,
      chefName: null,
      linkedAt: null,
      recipes: [],
      favorites: [],
      favoriteRecipeIds: [],
      currentPlan: null,
      planItems: [],
      selectedWeekStart: startOfWeekMonday(new Date()),
    });
  },

  initialize: async (consumerId: string) => {
    const monday = startOfWeekMonday(get().selectedWeekStart);
    set({ selectedWeekStart: monday });

    const { data: linkData, error: linkError } = await supabase
      .from('chef_consumers')
      .select('chef_id,created_at')
      .eq('consumer_id', consumerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (linkError || !linkData?.chef_id) {
      set({
        chefId: null,
        linkedAt: null,
        recipes: [],
        favorites: [],
        favoriteRecipeIds: [],
        currentPlan: null,
        planItems: [],
      });
      return;
    }

    const chefId = linkData.chef_id as string;
    const linkedAt = linkData.created_at as string;

    set({ chefId, linkedAt });
    await get().fetchChefRecipes(chefId);
    await get().fetchFavorites();
    await get().fetchOrCreatePlan(monday);
  },

  fetchChefRecipes: async (chefId: string) => {
    const { data, error } = await supabase
      .from('recipes')
      .select('id,name,cat,emoji,photo_url,time,difficulty,ingredients,steps,is_published')
      .eq('user_id', chefId)
      .eq('is_published', true)
      .order('name', { ascending: true });

    if (error) {
      set({ recipes: [] });
      return;
    }

    const recipes = (data as Recipe[]) ?? [];
    const favoriteIds = get().favoriteRecipeIds;
    const favorites = recipes.filter((recipe) => favoriteIds.includes(recipe.id));
    set({ recipes, favorites });
  },

  fetchFavorites: async () => {
    const session = (await supabase.auth.getSession()).data.session;
    const userId = session?.user?.id;
    if (!userId) {
      set({ favorites: [], favoriteRecipeIds: [] });
      return;
    }

    const { data, error } = await supabase.from('favorites').select('recipe_id').eq('user_id', userId);
    if (error) {
      set({ favorites: [], favoriteRecipeIds: [] });
      return;
    }

    const favoriteRecipeIds = ((data ?? []) as Array<{ recipe_id: number }>).map((row) => row.recipe_id);
    const recipes = get().recipes;
    const favorites = recipes.filter((recipe) => favoriteRecipeIds.includes(recipe.id));
    set({ favoriteRecipeIds, favorites });
  },

  toggleFavorite: async (recipeId: number) => {
    const session = (await supabase.auth.getSession()).data.session;
    const userId = session?.user?.id;
    if (!userId) return 'error';

    const exists = get().favoriteRecipeIds.includes(recipeId);

    if (exists) {
      const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('recipe_id', recipeId);
      if (error) return 'error';

      const favoriteRecipeIds = get().favoriteRecipeIds.filter((id) => id !== recipeId);
      const favorites = get().recipes.filter((recipe) => favoriteRecipeIds.includes(recipe.id));
      set({ favoriteRecipeIds, favorites });
      return 'removed';
    }

    const { error } = await supabase.from('favorites').insert({ user_id: userId, recipe_id: recipeId });
    if (error) return 'error';

    const favoriteRecipeIds = Array.from(new Set([...get().favoriteRecipeIds, recipeId]));
    const favorites = get().recipes.filter((recipe) => favoriteRecipeIds.includes(recipe.id));
    set({ favoriteRecipeIds, favorites });
    return 'added';
  },

  fetchOrCreatePlan: async (weekStart: Date) => {
    const state = get();
    const session = (await supabase.auth.getSession()).data.session;
    const consumerId = session?.user?.id;
    const chefId = state.chefId;

    if (!consumerId || !chefId) {
      set({ currentPlan: null, planItems: [] });
      return;
    }

    const normalizedWeek = startOfWeekMonday(weekStart);
    const weekStartISO = toISODate(normalizedWeek);

    let { data, error } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('consumer_id', consumerId)
      .eq('week_start', weekStartISO)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      return;
    }

    if (!data) {
      const inserted = await supabase
        .from('weekly_plans')
        .insert({
          consumer_id: consumerId,
          chef_id: chefId,
          week_start: weekStartISO,
        })
        .select('*')
        .single();

      if (inserted.error) return;
      data = inserted.data;
    }

    const plan = data as WeeklyPlan;
    set({ currentPlan: plan, selectedWeekStart: normalizedWeek });
    await get().fetchPlanItems(plan.id);
  },

  fetchPlanItems: async (planId: number) => {
    const { data, error } = await supabase
      .from('plan_items')
      .select(
        'id,plan_id,recipe_id,servings,days,notes,created_at,recipes(id,name,cat,emoji,photo_url,time,difficulty,ingredients,steps,is_published)'
      )
      .eq('plan_id', planId)
      .order('created_at', { ascending: true });

    if (error) {
      set({ planItems: [] });
      return;
    }

    const items = ((data ?? []) as any[]).map((item) => ({
      id: item.id,
      plan_id: item.plan_id,
      recipe_id: item.recipe_id,
      servings: item.servings ?? 1,
      days: Array.isArray(item.days) ? item.days : [],
      notes: item.notes ?? null,
      created_at: item.created_at,
      recipe: item.recipes ?? null,
    })) as PlanItemWithRecipe[];

    set({ planItems: items });
  },

  upsertPlanItem: async (recipeId: number, servings: number, days: string[]) => {
    const planId = get().currentPlan?.id;
    if (!planId) return;

    const uniqueDays = Array.from(new Set(days)).sort();

    const existing = get().planItems.find((item) => item.recipe_id === recipeId);
    if (existing) {
      const { error } = await supabase
        .from('plan_items')
        .update({
          servings: Math.max(1, servings),
          days: uniqueDays,
        })
        .eq('id', existing.id);

      if (!error) await get().fetchPlanItems(planId);
      return;
    }

    const { error } = await supabase.from('plan_items').insert({
      plan_id: planId,
      recipe_id: recipeId,
      servings: Math.max(1, servings),
      days: uniqueDays,
    });

    if (!error) await get().fetchPlanItems(planId);
  },

  removePlanItem: async (id: number) => {
    const planId = get().currentPlan?.id;
    if (!planId) return;

    const { error } = await supabase.from('plan_items').delete().eq('id', id);
    if (!error) {
      await get().fetchPlanItems(planId);
    }
  },

  navigateWeek: async (direction: Direction) => {
    const current = startOfWeekMonday(get().selectedWeekStart);
    const next = new Date(current);
    next.setDate(next.getDate() + (direction === 'next' ? 7 : -7));
    set({ selectedWeekStart: next });
    await get().fetchOrCreatePlan(next);
  },
}));

export { startOfWeekMonday, toISODate };
