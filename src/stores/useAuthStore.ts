import { create } from 'zustand';
import { authService } from '../services/auth.service';
import type { User } from '../types/user.type';
import { toast } from 'sonner';
import type { AuthStore } from '../types/useAuthStore.type';
import { normalizeUser } from '../utils/normalizeUser';
import { useBookingStore } from './useBookingStore';

export const useAuthStore = create<AuthStore>((set, get) => ({
  accessToken: null,
  user: null,
  loading: false,
  setAccessToken: (token: string | null) => set({ accessToken: token }),
  clearStore: () => {
    useBookingStore.getState().clearBooking();
    set({ user: null, accessToken: null });
  },
  register: async (payload) => {
    try {
      set({ loading: true });
      await authService.signUp(payload);
      toast.success('Registration successful!');
    } catch (error) {
      console.error(error);
      toast.error('Registration failed. Please try again.');
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  signIn: async (email, password) => {
    try {
      set({ loading: true });
      const res = await authService.signIn({ email, password });
      const userPayload = normalizeUser(res.user) ?? (res.user as User | null);
      set({ user: userPayload ?? null, accessToken: res.accessToken ?? null });
      if (res.accessToken && !res.user) {
        await get().fetchMe();
      }
      toast.success('Signed in successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Sign in failed. Please try again.');
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  signOut: async () => {
    try {
      await authService.signOut();
      get().clearStore();
      toast.success('Đăng xuất thành công!');
    } catch (error) {
      console.error(error);
      toast.error('Đăng xuất thất bại. Vui lòng thử lại.');
    }
  },
  fetchMe: async () => {
    try {
      set({ loading: true });
      const res = await authService.fetchMe();
      const user = normalizeUser(res.user ?? res);
      if (user) set({ user });
    } catch (error) {
      console.error(error);
    } finally {
      set({ loading: false });
    }
  },
  refresh: async (options) => {
    try {
      set({ loading: true });
      const res = await authService.refresh();
      set({ accessToken: res.accessToken ?? null });
      if (!get().user) {
        await get().fetchMe();
      }
    } catch (error) {
      console.error(error);
      if (!options?.silent) {
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
      }
      if (options?.silent) {
        set({ user: null, accessToken: null });
      } else {
        get().clearStore();
      }
      if (!options?.silent) {
        window.location.href = '/login';
      }
    } finally {
      set({ loading: false });
    }
  },
}));
