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
    set({ isLoading: true });
    const { data } = await supabase.auth.getSession();
    set({ session: data.session ?? null });

    if (data.session?.user?.id) {
      await get().fetchRole();
    } else {
      set({ role: null });
    }

    set({ isLoading: false });
  },

  fetchRole: async () => {
    const userId = get().session?.user?.id;
    if (!userId) {
      set({ role: null });
      return;
    }

    set({ isLoading: true });
    const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle();

    if (error) {
      set({ role: null, isLoading: false });
      return;
    }

    const role = (data?.role as Role) ?? null;
    set({ role, isLoading: false });
  },

  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({ session: null, role: null, isLoading: false });
  },
}));
