import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageService = {
  async getJSON(key, fallback = null) {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  },

  async setJSON(key, value) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  async getString(key, fallback = null) {
    const value = await AsyncStorage.getItem(key);
    return value ?? fallback;
  },

  async setString(key, value) {
    await AsyncStorage.setItem(key, value);
  },

  async remove(key) {
    await AsyncStorage.removeItem(key);
  },
};
