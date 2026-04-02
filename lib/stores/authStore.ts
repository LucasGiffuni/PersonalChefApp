import { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../supabase';

type Role = 'chef' | 'consumer' | null;

type AuthStore = {
  session: Session | null;
  role: Role;
  isLoading: boolean;
  initialize: () => Promise<void>;
  fetchRole: () => Promise<void>;
  signOut: () => Promise<void>;
  setSession: (session: Session | null) => void;
  setRole: (role: Role) => void;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  role: null,
  isLoading: true,

  setSession: (session) => set({ session }),
  setRole: (role) => set({ role }),

  initialize: async () => {
    console.log('[AUTH] initialize → start');
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('[AUTH] initialize → getSession error:', error.message);
        set({ session: null, role: null });
        return;
      }
      console.log('[AUTH] initialize → session:', data.session ? `user=${data.session.user.id}` : 'null');
      set({ session: data.session ?? null });

      if (data.session?.user?.id) {
        await get().fetchRole();
      } else {
        set({ role: null });
      }
    } catch (err: any) {
      console.error('[AUTH] initialize → unexpected error:', err?.message ?? err);
      set({ session: null, role: null });
    } finally {
      set({ isLoading: false });
      console.log('[AUTH] initialize → done, isLoading=false');
    }
  },

  fetchRole: async () => {
    const userId = get().session?.user?.id;
    console.log('[AUTH] fetchRole → userId:', userId ?? 'null');

    if (!userId) {
      set({ role: null, isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[AUTH] fetchRole → query error:', error.message);
        set({ role: null });
        return;
      }

      const role = (data?.role as Role) ?? null;
      console.log('[AUTH] fetchRole → role:', role);
      set({ role });
    } catch (err: any) {
      console.error('[AUTH] fetchRole → unexpected error:', err?.message ?? err);
      set({ role: null });
    } finally {
      set({ isLoading: false });
      console.log('[AUTH] fetchRole → done, isLoading=false');
    }
  },

  signOut: async () => {
    console.log('[AUTH] signOut → start');
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
    } catch (err: any) {
      console.warn('[AUTH] signOut → error:', err?.message ?? err);
    } finally {
      set({ session: null, role: null, isLoading: false });
      console.log('[AUTH] signOut → done');
    }
  },
}));
