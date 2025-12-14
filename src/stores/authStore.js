import { create } from 'zustand';
import { supabase } from '../config/supabase';

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  loading: true,

  // Initialize auth state from Supabase session
  initialize: async () => {
    try {
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        set({ loading: false });
        return;
      }

      if (session) {
        set({
          user: { id: session.user.id, email: session.user.email },
          session,
          isAuthenticated: true,
          loading: false,
        });
      } else {
        set({ loading: false });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          set({
            user: { id: session.user.id, email: session.user.email },
            session,
            isAuthenticated: true,
          });
        } else {
          set({
            user: null,
            session: null,
            isAuthenticated: false,
          });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      set({
        user: { id: data.user.id, email: data.user.email },
        session: data.session,
        isAuthenticated: true,
      });

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  },

  register: async (email, password) => {
    try {
      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        return {
          success: true,
          message: 'Please check your email to confirm your account',
          needsConfirmation: true
        };
      }

      if (data.session) {
        set({
          user: { id: data.user.id, email: data.user.email },
          session: data.session,
          isAuthenticated: true,
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
      set({
        user: null,
        session: null,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  // For backward compatibility - now just calls initialize
  checkAuth: () => {
    get().initialize();
  },

  getUser: () => get().user,

  getSession: () => get().session,

  // Handle deep link authentication (email confirmation, magic links)
  handleDeepLinkAuth: async (authData) => {
    try {
      const { access_token, refresh_token } = authData;

      if (!access_token) {
        console.error('No access token in deep link');
        return { success: false, error: 'No access token provided' };
      }

      // Set the session using the tokens from the deep link
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        console.error('Error setting session from deep link:', error);
        return { success: false, error: error.message };
      }

      if (data.session) {
        set({
          user: { id: data.session.user.id, email: data.session.user.email },
          session: data.session,
          isAuthenticated: true,
        });
        return { success: true };
      }

      return { success: false, error: 'Failed to establish session' };
    } catch (error) {
      console.error('Deep link auth error:', error);
      return { success: false, error: error.message };
    }
  },
}));
