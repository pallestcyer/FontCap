const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

class APIClient {
  constructor() {
    this.accessToken = null;
  }

  setToken(token) {
    this.accessToken = token;
  }

  async registerDevice(deviceData) {
    try {
      const response = await axios.post(`${API_URL}/devices/register`, deviceData, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      return response.data;
    } catch (error) {
      console.error('Device registration error:', error.response?.data || error.message);
      throw error;
    }
  }

  async bulkRegisterFonts(fonts, deviceId) {
    try {
      const response = await axios.post(`${API_URL}/fonts/bulk-register`, 
        { fonts, deviceId },
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Bulk register error:', error.response?.data || error.message);
      throw error;
    }
  }

  async checkFontHash(hash) {
    try {
      const response = await axios.get(`${API_URL}/fonts/check-hash/${hash}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      return response.data;
    } catch (error) {
      console.error('Hash check error:', error.response?.data || error.message);
      return { exists: false };
    }
  }

  async updateDeviceScan(deviceId, scanData) {
    try {
      const response = await axios.put(`${API_URL}/devices/${deviceId}`, scanData, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      return response.data;
    } catch (error) {
      console.error('Device update error:', error.response?.data || error.message);
      throw error;
    }
  }

  async triggerSync(deviceId) {
    try {
      const response = await axios.post(`${API_URL}/sync/trigger`,
        { deviceId },
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Sync trigger error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new APIClient();
