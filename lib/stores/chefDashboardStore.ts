import { create } from 'zustand';
import { supabase } from '../supabase';
import { PlanItemWithRecipe, startOfWeekMonday, toISODate } from './consumerStore';
import { useAuthStore } from './authStore';

export type ConsumerWithProfile = {
  consumerId: string;
  displayName: string;
  linkedAt: string;
};

export type WeekOrderGroup = {
  consumer: ConsumerWithProfile;
  items: PlanItemWithRecipe[];
};

export type RecipeAggregate = {
  recipe: PlanItemWithRecipe['recipe'];
  totalServings: number;
  consumerCount: number;
};

type ChefDashboardStore = {
  consumers: ConsumerWithProfile[];
  weekOrders: WeekOrderGroup[];
  selectedWeekStart: Date;
  fetchConsumers: () => Promise<void>;
  fetchWeekOrders: (weekStart: Date) => Promise<void>;
  computeAggregate: (weekOrders: WeekOrderGroup[]) => RecipeAggregate[];
  navigateWeek: (direction: 'prev' | 'next') => Promise<void>;
};

export const useChefDashboardStore = create<ChefDashboardStore>((set, get) => ({
  consumers: [],
  weekOrders: [],
  selectedWeekStart: startOfWeekMonday(new Date()),

  fetchConsumers: async () => {
    const chefId = useAuthStore.getState().session?.user?.id;
    if (!chefId) {
      set({ consumers: [] });
      return;
    }

    const { data: links, error: linksError } = await supabase
      .from('chef_consumers')
      .select('consumer_id,created_at')
      .eq('chef_id', chefId)
      .order('created_at', { ascending: false });

    if (linksError || !links?.length) {
      set({ consumers: [] });
      return;
    }

    const consumerIds = links.map((item: any) => item.consumer_id);
    const { data: profiles } = await supabase
      .from('consumer_profiles')
      .select('user_id,display_name')
      .in('user_id', consumerIds);

    const profileMap = new Map<string, string>();
    (profiles ?? []).forEach((profile: any) => {
      profileMap.set(profile.user_id, profile.display_name ?? '');
    });

    const consumers = links.map((item: any) => ({
      consumerId: item.consumer_id as string,
      displayName: profileMap.get(item.consumer_id) || 'Consumidor',
      linkedAt: item.created_at as string,
    }));

    set({ consumers });
  },

  fetchWeekOrders: async (weekStart: Date) => {
    const chefId = useAuthStore.getState().session?.user?.id;
    if (!chefId) {
      set({ weekOrders: [] });
      return;
    }

    const normalized = startOfWeekMonday(weekStart);
    const weekISO = toISODate(normalized);

    const { data: plans } = await supabase
      .from('weekly_plans')
      .select('id,consumer_id')
      .eq('chef_id', chefId)
      .eq('week_start', weekISO);

    if (!plans?.length) {
      set({ weekOrders: [], selectedWeekStart: normalized });
      return;
    }

    const planIds = plans.map((plan: any) => plan.id);
    const planById = new Map<number, string>();
    plans.forEach((plan: any) => planById.set(plan.id, plan.consumer_id));

    const { data: items } = await supabase
      .from('plan_items')
      .select(
        'id,plan_id,recipe_id,servings,days,notes,created_at,recipes(id,name,cat,emoji,photo_url,time,difficulty,ingredients,steps,is_published)'
      )
      .in('plan_id', planIds)
      .order('created_at', { ascending: true });

    const consumers = get().consumers;
    const consumerMap = new Map<string, ConsumerWithProfile>();
    consumers.forEach((consumer) => consumerMap.set(consumer.consumerId, consumer));

    const grouped = new Map<string, PlanItemWithRecipe[]>();
    (items ?? []).forEach((item: any) => {
      const consumerId = planById.get(item.plan_id);
      if (!consumerId) return;

      const normalizedItem: PlanItemWithRecipe = {
        id: item.id,
        plan_id: item.plan_id,
        recipe_id: item.recipe_id,
        servings: item.servings ?? 1,
        days: Array.isArray(item.days) ? item.days : [],
        notes: item.notes ?? null,
        created_at: item.created_at,
        recipe: item.recipes ?? null,
      };

      const current = grouped.get(consumerId) ?? [];
      current.push(normalizedItem);
      grouped.set(consumerId, current);
    });

    const weekOrders: WeekOrderGroup[] = Array.from(grouped.entries()).map(([consumerId, consumerItems]) => ({
      consumer:
        consumerMap.get(consumerId) ??
        ({
          consumerId,
          displayName: 'Consumidor',
          linkedAt: '',
        } as ConsumerWithProfile),
      items: consumerItems,
    }));

    set({ weekOrders, selectedWeekStart: normalized });
  },

  computeAggregate: (weekOrders: WeekOrderGroup[]) => {
    const aggregate = new Map<number, { recipe: PlanItemWithRecipe['recipe']; totalServings: number; consumerIds: Set<string> }>();

    weekOrders.forEach((group) => {
      group.items.forEach((item) => {
        if (!item.recipe) return;
        const current = aggregate.get(item.recipe_id) ?? {
          recipe: item.recipe,
          totalServings: 0,
          consumerIds: new Set<string>(),
        };
        current.totalServings += item.servings * Math.max(1, item.days.length);
        current.consumerIds.add(group.consumer.consumerId);
        aggregate.set(item.recipe_id, current);
      });
    });

    return Array.from(aggregate.values())
      .map((entry) => ({
        recipe: entry.recipe,
        totalServings: entry.totalServings,
        consumerCount: entry.consumerIds.size,
      }))
      .sort((a, b) => b.totalServings - a.totalServings);
  },

  navigateWeek: async (direction: 'prev' | 'next') => {
    const base = startOfWeekMonday(get().selectedWeekStart);
    const next = new Date(base);
    next.setDate(base.getDate() + (direction === 'next' ? 7 : -7));
    set({ selectedWeekStart: next });
    await get().fetchWeekOrders(next);
  },
}));
