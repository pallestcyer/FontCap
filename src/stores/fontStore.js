import { create } from 'zustand';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export const useFontStore = create((set, get) => ({
  fonts: [],
  loading: false,
  scanning: false,
  scanProgress: 0,
  filter: 'all',
  searchQuery: '',

  fetchFonts: async () => {
    set({ loading: true });
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_URL}/fonts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ fonts: response.data.fonts, loading: false });
    } catch (error) {
      console.error('Error fetching fonts:', error);
      set({ loading: false });
    }
  },

  uploadFont: async (file, metadata) => {
    try {
      const token = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('font', file);
      
      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      const response = await axios.post(`${API_URL}/fonts/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      await get().fetchFonts();
      return { success: true, font: response.data.font };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Upload failed' };
    }
  },

  bulkRegisterFonts: async (fonts, deviceId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(`${API_URL}/fonts/bulk-register`, 
        { fonts, deviceId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await get().fetchFonts();
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Registration failed' };
    }
  },

  deleteFont: async (fontId) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`${API_URL}/fonts/${fontId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await get().fetchFonts();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Delete failed' };
    }
  },

  setFilter: (filter) => set({ filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  getFilteredFonts: () => {
    const { fonts, filter, searchQuery } = get();
    
    let filtered = fonts;
    
    if (searchQuery) {
      filtered = filtered.filter(font => 
        font.font_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        font.font_family.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  },
}));
