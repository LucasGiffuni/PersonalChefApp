import { create } from 'zustand';
import { supabase } from '../supabase';
import { PlanItemWithRecipe, startOfWeekMonday, toISODate } from './consumerStore';
import { useAuthStore } from './authStore';
import { showToast } from '../utils/toast';

let realtimeChannel: any = null;
let realtimeSubscribers = 0;

const DAY_LABELS: Record<string, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo',
};

function formatDays(days: unknown): string {
  if (!Array.isArray(days) || days.length === 0) return 'su semana';
  const labels = days.map((day) => DAY_LABELS[String(day)] ?? String(day)).filter(Boolean);
  if (!labels.length) return 'su semana';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} y ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
}

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
  startRealtimeSync: () => void;
  stopRealtimeSync: () => void;
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

  startRealtimeSync: () => {
    realtimeSubscribers += 1;
    if (realtimeChannel) return;

    realtimeChannel = supabase
      .channel('plan_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plan_items',
        },
        async (payload: any) => {
          const chefId = useAuthStore.getState().session?.user?.id;
          if (!chefId) return;

          const row = payload?.new ?? payload?.old ?? null;
          const planId = row?.plan_id ?? null;
          if (!planId) return;

          const { data: plan } = await supabase
            .from('weekly_plans')
            .select('id,chef_id,consumer_id')
            .eq('id', planId)
            .maybeSingle();

          if (!plan || plan.chef_id !== chefId) return;

          const [{ data: profile }, { data: recipe }] = await Promise.all([
            supabase
              .from('consumer_profiles')
              .select('display_name')
              .eq('user_id', plan.consumer_id)
              .maybeSingle(),
            supabase
              .from('recipes')
              .select('name,title')
              .eq('id', row?.recipe_id ?? 0)
              .maybeSingle(),
          ]);

          const consumerName = String(profile?.display_name ?? 'Un consumidor').trim() || 'Un consumidor';
          const recipeName = String(recipe?.name ?? recipe?.title ?? 'una receta').trim() || 'una receta';
          const servings = Math.max(1, Number(row?.servings ?? 1));
          const daysLabel = formatDays(row?.days);

          if (payload.eventType === 'INSERT') {
            showToast({
              type: 'success',
              message: `${consumerName} agregó ${recipeName} (${servings} porciones) para ${daysLabel}`,
            });
          } else if (payload.eventType === 'UPDATE') {
            showToast({
              type: 'info',
              message: `${consumerName} modificó su pedido`,
            });
          } else if (payload.eventType === 'DELETE') {
            showToast({
              type: 'warning',
              message: `${consumerName} eliminó su pedido`,
            });
          }

          const activeWeek = get().selectedWeekStart;
          await get().fetchConsumers();
          await get().fetchWeekOrders(activeWeek);
        }
      )
      .subscribe();
  },

  stopRealtimeSync: () => {
    realtimeSubscribers = Math.max(0, realtimeSubscribers - 1);
    if (realtimeSubscribers > 0) return;
    if (!realtimeChannel) return;
    void supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  },
}));
