import { create } from 'zustand';
import { secureStorage } from '../lib/secureStorage';
import { authService } from '../services/auth.service';
import { queryClient } from '../lib/queryClient';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  loadAuth: () => Promise<void>;
  logout: () => Promise<void>;
  clearLocalAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  setAuth: (token, user) => {
    secureStorage.setToken(token);
    secureStorage.setUser(JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  loadAuth: async () => {
    try {
      const token = await secureStorage.getToken();
      const userStr = await secureStorage.getUser();

      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true });
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
    }
  },

  // Clear local state only — used by 401 interceptor to avoid recursive API calls
  clearLocalAuth: async () => {
    await secureStorage.clear();
    queryClient.clear();
    set({ token: null, user: null, isAuthenticated: false });
  },

  // Full logout — calls API then clears local state
  logout: async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Server-side cleanup failed — continue with local cleanup
    } finally {
      await secureStorage.clear();
      queryClient.clear();
      set({ token: null, user: null, isAuthenticated: false });
    }
  },
}));
