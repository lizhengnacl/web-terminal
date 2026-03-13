/**
 * 认证状态管理模块
 *
 * 功能：
 * - 管理用户登录状态
 * - 处理登录/登出逻辑
 * - 持久化登录状态到 LocalStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login as apiLogin, register as apiRegister, getMe } from '../services/terminalService';

interface User {
  id: string;
  username: string;
  role: string;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  login: (username: string, password: string) => Promise<{ token: string; user: User } | null>;
  register: (username: string, password: string) => Promise<{ token: string; user: User } | null>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      token: null,
      user: null,

      login: async (username: string, password: string): Promise<{ token: string; user: User } | null> => {
        try {
          const response = await apiLogin(username, password);
          set({
            isAuthenticated: true,
            token: response.token,
            user: response.user,
          });
          return { token: response.token, user: response.user };
        } catch (error) {
          console.error('Login failed:', error);
          return null;
        }
      },

      register: async (username: string, password: string): Promise<{ token: string; user: User } | null> => {
        try {
          const response = await apiRegister(username, password);
          set({
            isAuthenticated: true,
            token: response.token,
            user: response.user,
          });
          return { token: response.token, user: response.user };
        } catch (error) {
          console.error('Registration failed:', error);
          return null;
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          token: null,
          user: null,
        });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const response = await getMe(token);
          set({
            user: response.user,
          });
        } catch (error) {
          set({
            isAuthenticated: false,
            token: null,
            user: null,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
