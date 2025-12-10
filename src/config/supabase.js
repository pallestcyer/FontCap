import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase not configured. Cloud sync features will be disabled. To enable, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
}

// Create a mock client that returns empty results when Supabase isn't configured
const createMockClient = () => ({
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
    signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: () => ({
    select: () => ({ data: [], error: null, eq: () => ({ data: [], error: null, single: () => ({ data: null, error: null }) }) }),
    insert: () => ({ data: null, error: { message: 'Supabase not configured' } }),
    update: () => ({ data: null, error: { message: 'Supabase not configured' }, eq: () => ({ data: null, error: { message: 'Supabase not configured' } }) }),
    delete: () => ({ error: { message: 'Supabase not configured' }, eq: () => ({ error: { message: 'Supabase not configured' } }) }),
    upsert: () => ({ data: null, error: { message: 'Supabase not configured' } }),
  }),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      download: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      createSignedUrl: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      remove: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
    }),
  },
});

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient();

export { supabaseUrl, supabaseAnonKey };
