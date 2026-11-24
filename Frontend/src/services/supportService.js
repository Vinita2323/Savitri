import API from './api';

const DEFAULT_SUPPORT_SETTINGS = {
  customerPhone: '+91 63774 60692',
  customerEmail: 'sreplwm@gmail.com',
  customerHours: '24/7 Priority Support',
  sellerPhone: '+91 63774 60692',
  sellerEmail: 'sreplwm@gmail.com',
  sellerHours: 'Mon - Sat (9 AM - 8 PM)',
  captainPhone: '+91 63774 60692',
  captainEmail: 'sreplwm@gmail.com',
  captainHours: '24/7 Active Dispatch Line',
  whatsappNumber: '+91 63774 60692',
  footerBrandName: 'Natural Agro Farm',
  footerTagline: 'Fresh groceries, staples and daily essentials from stores near you, delivered fast to your doorstep.',
  footerPhone: '+91 81029 14300',
  footerEmail: 'sreplwm@gmail.com',
  footerAddress: '',
  footerHours: '',
  bannerTitle: "We're here to help",
  bannerSubtitle: 'Have an issue with your order or want to share feedback? Connect with us directly.',
};

export const supportService = {
  // Get platform support & contact settings
  getSupportSettings: async () => {
    try {
      const response = await API.get('/support-settings');
      if (response.data && response.data.success && response.data.settings) {
        return response.data.settings;
      }
      return DEFAULT_SUPPORT_SETTINGS;
    } catch (error) {
      console.warn('Using default support settings fallback:', error);
      return DEFAULT_SUPPORT_SETTINGS;
    }
  },

  // Update platform support & contact settings (Admin)
  updateSupportSettings: async (settingsData) => {
    try {
      const response = await API.put('/support-settings', settingsData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message || error;
    }
  },
};

export default supportService;
