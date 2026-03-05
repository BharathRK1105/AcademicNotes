import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'authToken';

export const tokenStorage = {
  async getToken() {
    return AsyncStorage.getItem(TOKEN_KEY);
  },

  async setToken(token) {
    if (!token) {
      await AsyncStorage.removeItem(TOKEN_KEY);
      return;
    }
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  async clearToken() {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
};
