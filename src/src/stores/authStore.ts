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

interface AuthState {
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

// 模拟正确的密码（实际项目中应该从服务器验证）
const CORRECT_PASSWORD = 'admin123';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,

      login: async (password: string): Promise<boolean> => {
        // 模拟网络延迟
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (password === CORRECT_PASSWORD) {
          set({ isAuthenticated: true });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
