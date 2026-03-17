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

  async getProfileInsights() {
    const response = await api.get('/admin/profile/insights');
    return response.data;
  },

  async getReports(status) {
    const response = await api.get('/admin/reports', { params: status ? { status } : {} });
    return response.data;
  },

  async resolveReport(reportId, action = 'dismiss') {
    const response = await api.patch(`/admin/reports/${reportId}/resolve`, { action });
    return response.data;
  },
};
