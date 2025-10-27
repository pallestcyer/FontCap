import { create } from 'zustand';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,

  login: async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { user, accessToken, refreshToken } = response.data;
      
      set({
        user,
        isAuthenticated: true,
        accessToken,
        refreshToken,
      });
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
  },

  register: async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, { email, password });
      const { user, accessToken, refreshToken } = response.data;
      
      set({
        user,
        isAuthenticated: true,
        accessToken,
        refreshToken,
      });
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Registration failed' };
    }
  },

  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
    });
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  checkAuth: () => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (accessToken && refreshToken) {
      set({
        isAuthenticated: true,
        accessToken,
        refreshToken,
      });
    }
  },
}));
