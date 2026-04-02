import { create } from 'zustand';
import { supabase } from '../supabase';
import { generateCode } from '../utils/inviteCode';
import { useAuthStore } from './authStore';

export type InviteCode = {
  id: number;
  chef_id: string;
  code: string;
  max_uses: number;
  uses_count: number;
  expires_at: string | null;
  created_at: string;
};

type ValidateCodeResult = {
  valid: boolean;
  chefName: string | null;
  chefId: string | null;
};

type InviteStore = {
  codes: InviteCode[];
  fetchCodes: () => Promise<void>;
  createCode: (maxUses: number, expiresAt?: Date) => Promise<InviteCode>;
  deleteCode: (id: number) => Promise<void>;
  validateCode: (code: string) => Promise<ValidateCodeResult>;
  redeemCode: (code: string, userId: string) => Promise<string>;
};

export const useInviteStore = create<InviteStore>((set, get) => ({
  codes: [],

  fetchCodes: async () => {
    const session = useAuthStore.getState().session;
    const chefId = session?.user?.id;
    if (!chefId) {
      set({ codes: [] });
      return;
    }

    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('chef_id', chefId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    set({ codes: (data as InviteCode[]) ?? [] });
  },

  createCode: async (maxUses: number, expiresAt?: Date) => {
    const session = useAuthStore.getState().session;
    const chefId = session?.user?.id;

    if (!chefId) {
      throw new Error('No hay sesión activa');
    }

    let created: InviteCode | null = null;

    for (let attempts = 0; attempts < 4; attempts += 1) {
      const payload = {
        chef_id: chefId,
        code: generateCode(),
        max_uses: Math.max(1, maxUses),
        expires_at: expiresAt ? expiresAt.toISOString() : null,
      };

      const { data, error } = await supabase.from('invite_codes').insert(payload).select('*').single();

      if (!error && data) {
        created = data as InviteCode;
        break;
      }

      if (!error || error.code !== '23505') {
        throw error;
      }
    }

    if (!created) {
      throw new Error('No se pudo generar un código único');
    }

    set({ codes: [created, ...get().codes] });
    return created;
  },

  deleteCode: async (id: number) => {
    const session = useAuthStore.getState().session;
    const chefId = session?.user?.id;
    if (!chefId) throw new Error('No hay sesión activa');

    const { error } = await supabase.from('invite_codes').delete().eq('id', id).eq('chef_id', chefId);
    if (error) throw error;

    set({ codes: get().codes.filter((item) => item.id !== id) });
  },

  validateCode: async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return { valid: false, chefName: null, chefId: null };

    const { data, error } = await supabase
      .from('invite_codes')
      .select('chef_id,max_uses,uses_count,expires_at')
      .eq('code', cleanCode)
      .maybeSingle();

    if (error || !data) {
      return { valid: false, chefName: null, chefId: null };
    }

    const notExpired = !data.expires_at || new Date(data.expires_at).getTime() > Date.now();
    const hasCapacity = (data.uses_count ?? 0) < (data.max_uses ?? 0);
    if (!notExpired || !hasCapacity) {
      return { valid: false, chefName: null, chefId: null };
    }

    return {
      valid: true,
      chefName: null,
      chefId: data.chef_id ?? null,
    };
  },

  redeemCode: async (code: string, userId: string) => {
    const cleanCode = code.trim().toUpperCase();
    const { data, error } = await supabase.rpc('redeem_invite_code', {
      p_code: cleanCode,
      p_consumer_id: userId,
    });

    if (error) throw error;
    return data as string;
  },
}));
