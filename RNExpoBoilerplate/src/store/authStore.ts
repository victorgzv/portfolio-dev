import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { identifyUser, logoutUser as revenueCatLogout } from '../lib/revenuecat';
import { AuthState, User, LoginCredentials, RegisterCredentials } from '../types';
import * as SecureStore from 'expo-secure-store';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          const user: User = {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            avatar_url: profile.avatar_url,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
          };

          set({ user, isAuthenticated: true });
          
          // Identify user with RevenueCat
          await identifyUser(user.id);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (credentials: LoginCredentials) => {
    try {
      set({ isLoading: true });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;

      if (data.user) {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          const user: User = {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            avatar_url: profile.avatar_url,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
          };

          set({ user, isAuthenticated: true });
          
          // Store session token securely
          if (data.session?.access_token) {
            await SecureStore.setItemAsync('auth_token', data.session.access_token);
          }
          
          // Identify user with RevenueCat
          await identifyUser(user.id);
        }
      }
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (credentials: RegisterCredentials) => {
    try {
      set({ isLoading: true });

      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;

      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: credentials.email,
            name: credentials.name,
          });

        if (profileError) throw profileError;

        // If user is confirmed immediately, set the user
        if (data.user.email_confirmed_at) {
          const user: User = {
            id: data.user.id,
            email: credentials.email,
            name: credentials.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          set({ user, isAuthenticated: true });
          
          // Identify user with RevenueCat
          await identifyUser(user.id);
        }
      }
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });

      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Logout from RevenueCat
      await revenueCatLogout();
      
      // Clear secure storage
      await SecureStore.deleteItemAsync('auth_token');

      set({ user: null, isAuthenticated: false });
    } catch (error: any) {
      console.error('Logout error:', error);
      // Even if there's an error, clear the local state
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithGoogle: async () => {
    try {
      set({ isLoading: true });
      
      // Implement Google OAuth with Expo AuthSession
      // This is a placeholder - you'll need to implement the full OAuth flow
      throw new Error('Google login not implemented yet');
    } catch (error: any) {
      throw new Error(error.message || 'Google login failed');
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithApple: async () => {
    try {
      set({ isLoading: true });
      
      // Implement Apple OAuth with Expo AuthSession
      // This is a placeholder - you'll need to implement the full OAuth flow
      throw new Error('Apple login not implemented yet');
    } catch (error: any) {
      throw new Error(error.message || 'Apple login failed');
    } finally {
      set({ isLoading: false });
    }
  },

  resetPassword: async (email: string) => {
    try {
      set({ isLoading: true });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'rnexpoboilerplate://reset-password',
      });

      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.message || 'Password reset failed');
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates: Partial<User>) => {
    try {
      set({ isLoading: true });
      const { user } = get();
      
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      set({ user: { ...user, ...updates } });
    } catch (error: any) {
      throw new Error(error.message || 'Profile update failed');
    } finally {
      set({ isLoading: false });
    }
  },
}));