import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in environment');
}

const createSupabaseClient = (): SupabaseClient =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

const globalForSupabase = globalThis as typeof globalThis & {
  __personalChefSupabase?: SupabaseClient;
};

export const supabase = globalForSupabase.__personalChefSupabase ?? createSupabaseClient();

if (!globalForSupabase.__personalChefSupabase) {
  globalForSupabase.__personalChefSupabase = supabase;
}
