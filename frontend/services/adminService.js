import { api } from './api';

export const adminService = {
  async getUsers() {
    const response = await api.get('/admin/users');
    return response.data;
  },

  async deleteUser(userId) {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  async blockUser(userId, isBlocked) {
    const response = await api.patch(`/admin/users/${userId}/block`, { isBlocked });
    return response.data;
  },
};
