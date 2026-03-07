import { api } from './api';
import { tokenStorage } from './tokenStorage';

export const authService = {
  async registerStudent({ name, email, password }) {
    const response = await api.post('/auth/register', { name, email, password });
    const { token } = response.data;
    await tokenStorage.setToken(token);
    return response.data;
  },

  async loginStudent({ usernameOrEmail, password }) {
    const response = await api.post('/auth/login', { usernameOrEmail, password });
    const { token } = response.data;
    await tokenStorage.setToken(token);
    return response.data;
  },

  async loginAdmin({ username, password }) {
    const response = await api.post('/auth/admin/login', { username, password });
    const { token } = response.data;
    await tokenStorage.setToken(token);
    return response.data;
  },

  async loginWithGoogle(tokens) {
    const response = await api.post('/auth/google', tokens);
    const { token } = response.data;
    await tokenStorage.setToken(token);
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async getStoredToken() {
    return tokenStorage.getToken();
  },

  async logoutUser() {
    await tokenStorage.clearToken();
  },
};
