import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: number;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user: User, token: string) => {
        set({ user, token, isAuthenticated: true });
        localStorage.setItem('access_token', token);
        localStorage.setItem('user', JSON.stringify(user));
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      },
      setUser: (user: User) => {
        set({ user });
        localStorage.setItem('user', JSON.stringify(user));
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize auth state from localStorage on client side
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('access_token');
  const userStr = localStorage.getItem('user');
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      useAuth.getState().login(user, token);
    } catch (error) {
      // If parsing fails, clear invalid data
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
  }
}





