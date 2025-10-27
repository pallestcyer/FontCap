import { create } from 'zustand';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export const useDeviceStore = create((set, get) => ({
  devices: [],
  currentDevice: null,
  loading: false,

  fetchDevices: async () => {
    set({ loading: true });
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_URL}/devices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ devices: response.data.devices, loading: false });
    } catch (error) {
      console.error('Error fetching devices:', error);
      set({ loading: false });
    }
  },

  registerDevice: async (deviceData) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(`${API_URL}/devices/register`, deviceData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await get().fetchDevices();
      return { success: true, device: response.data.device, isNewDevice: response.data.isNewDevice };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Registration failed' };
    }
  },

  deleteDevice: async (deviceId) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`${API_URL}/devices/${deviceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await get().fetchDevices();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Delete failed' };
    }
  },

  setCurrentDevice: (device) => set({ currentDevice: device }),
}));
