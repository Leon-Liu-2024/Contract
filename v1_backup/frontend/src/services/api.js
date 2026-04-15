import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// 合約 API
export const contractAPI = {
  list: (params) => api.get('/contracts', { params }),
  get: (id) => api.get(`/contracts/${id}`),
  create: (data) => {
    if (data instanceof FormData) {
      return api.post('/contracts', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.post('/contracts', data);
  },
  update: (id, data) => api.put(`/contracts/${id}`, data),
  archive: (id, userId) => api.post(`/contracts/${id}/archive`, { user_id: userId }),
  terminate: (id, userId, reason) => api.post(`/contracts/${id}/terminate`, { user_id: userId, reason }),
};

// 範本 API
export const templateAPI = {
  list: (params) => api.get('/templates', { params }),
  get: (id) => api.get(`/templates/${id}`),
  create: (data) => api.post('/templates', data),
  update: (id, data) => api.put(`/templates/${id}`, data),
};

// 簽核 API
export const approvalAPI = {
  flows: () => api.get('/approvals/flows'),
  submit: (data) => api.post('/approvals/submit', data),
  action: (data) => api.post('/approvals/action', data),
  pending: (userId) => api.get(`/approvals/pending/${userId}`),
  history: (contractId) => api.get(`/approvals/history/${contractId}`),
};

// 使用者 API
export const userAPI = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
};

// 報表 API
export const reportAPI = {
  dashboard: () => api.get('/reports/dashboard'),
  amountSummary: (params) => api.get('/reports/amount-summary', { params }),
  approvalEfficiency: () => api.get('/reports/approval-efficiency'),
};

// 通知 API
export const notificationAPI = {
  list: (userId, params) => api.get(`/notifications/${userId}`, { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: (userId) => api.put(`/notifications/read-all/${userId}`),
};

export default api;
