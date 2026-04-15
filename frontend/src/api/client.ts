import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
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

export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

export const contractAPI = {
  list: (params?: Record<string, unknown>) => api.get('/contracts/', { params }),
  get: (id: number) => api.get(`/contracts/${id}`),
  create: (data: Record<string, unknown>) => api.post('/contracts/', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/contracts/${id}`, data),
  advance: (id: number, comment?: string) => api.post(`/contracts/${id}/advance`, { comment }),
  reject: (id: number, comment: string) => api.post(`/contracts/${id}/reject`, { comment }),
  void: (id: number, reason: string) => api.post(`/contracts/${id}/void`, { reason }),
  submitApproval: (id: number, workflowId: number) =>
    api.post(`/contracts/${id}/submit-approval`, { workflow_id: workflowId }),
  stamp: (id: number, data: Record<string, boolean>) => api.post(`/contracts/${id}/stamp`, data),
  upload: (id: number, file: File, docType: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('doc_type', docType);
    return api.post(`/contracts/${id}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const vendorAPI = {
  list: (params?: Record<string, unknown>) => api.get('/vendors/', { params }),
  get: (id: number) => api.get(`/vendors/${id}`),
  create: (data: Record<string, unknown>) => api.post('/vendors/', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/vendors/${id}`, data),
  delete: (id: number) => api.delete(`/vendors/${id}`),
};

export const approvalAPI = {
  pending: () => api.get('/approvals/pending'),
  approve: (recordId: number, comment?: string) =>
    api.post(`/approvals/${recordId}/approve`, { comment }),
  reject: (recordId: number, comment: string) =>
    api.post(`/approvals/${recordId}/reject`, { comment }),
  batchApprove: (recordIds: number[], comment?: string) =>
    api.post('/approvals/batch-approve', { record_ids: recordIds, comment }),
};

export const workflowAPI = {
  list: () => api.get('/workflows/'),
  create: (data: Record<string, unknown>) => api.post('/workflows/', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/workflows/${id}`, data),
  delete: (id: number) => api.delete(`/workflows/${id}`),
};

export const notificationAPI = {
  list: (unread_only?: boolean) => api.get('/notifications/', { params: { unread_only } }),
  markRead: (id: number) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
  stageSummary: () => api.get('/dashboard/stage-summary'),
  recentActivity: () => api.get('/dashboard/recent-activity'),
  exportExcel: () => api.get('/dashboard/admin/export', { responseType: 'blob' }),
};

export const templateAPI = {
  list: () => api.get('/templates/'),
  fields: (templateId: string) => api.get(`/templates/${templateId}/fields`),
  preview: (contractId: number, templateId: string) =>
    api.get(`/contracts/${contractId}/template-preview`, { params: { template_id: templateId } }),
  generate: (contractId: number, templateId: string, fieldValues: Record<string, string>, autoFill = true) =>
    api.post(`/contracts/${contractId}/generate-template`, {
      template_id: templateId,
      field_values: fieldValues,
      auto_fill: autoFill,
    }),
  downloadBlank: (templateId: string) =>
    api.get(`/templates/download/${templateId}`, { responseType: 'blob' }),
  downloadDocument: (documentId: number) =>
    api.get(`/documents/${documentId}/download`, { responseType: 'blob' }),
};

export const userAPI = {
  list: () => api.get('/users/'),
  create: (data: Record<string, unknown>) => api.post('/users/', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
};
