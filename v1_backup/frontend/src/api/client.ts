import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// JWT Token 攔截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

// Contracts
export const contractAPI = {
  list: (params?: Record<string, unknown>) => api.get('/contracts/', { params }),
  get: (id: number) => api.get(`/contracts/${id}`),
  create: (data: Record<string, unknown>) => api.post('/contracts/', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/contracts/${id}`, data),
  void: (id: number, reason: string) => api.post(`/contracts/${id}/void`, { reason }),
  uploadFile: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/contracts/${id}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadFile: (contractId: number, fileId: number) =>
    api.get(`/contracts/${contractId}/attachments/${fileId}`, { responseType: 'blob' }),
};

// Approvals
export const approvalAPI = {
  pending: () => api.get('/approvals/pending'),
  submit: (contractId: number, workflowId: number) =>
    api.post(`/approvals/${contractId}/submit`, { workflow_id: workflowId }),
  approve: (contractId: number, comment?: string) =>
    api.post(`/approvals/${contractId}/approve`, { comment }),
  reject: (contractId: number, comment: string) =>
    api.post(`/approvals/${contractId}/reject`, { comment }),
  batchApprove: (contractIds: number[], comment?: string) =>
    api.post('/approvals/batch-approve', { contract_ids: contractIds, comment }),
  remind: (contractId: number) =>
    api.post(`/approvals/${contractId}/remind`),
};

// Workflows
export const workflowAPI = {
  list: () => api.get('/workflows/'),
  create: (data: Record<string, unknown>) => api.post('/workflows/', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/workflows/${id}`, data),
  delete: (id: number) => api.delete(`/workflows/${id}`),
  recommend: (params?: Record<string, unknown>) => api.get('/workflows/recommend', { params }),
};

// Notifications
export const notificationAPI = {
  list: (unread_only?: boolean) => api.get('/notifications/', { params: { unread_only } }),
  markRead: (id: number) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

// Dashboard
export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
  recentActivity: () => api.get('/dashboard/recent-activity'),
  adminStats: () => api.get('/dashboard/admin/stats'),
  export: (params?: Record<string, unknown>) => api.get('/dashboard/admin/export', { responseType: 'blob', params }),
  overdue: (days?: number) => api.get('/dashboard/admin/overdue', { params: { days } }),
};

// Users
export const userAPI = {
  list: () => api.get('/users/'),
  create: (data: Record<string, unknown>) => api.post('/users/', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
};
