export const CONTRACT_STATUS = {
  draft: { label: '草稿', color: '#8c8c8c', bg: '#f5f5f5' },
  pending: { label: '待送簽', color: '#faad14', bg: '#fffbe6' },
  in_review: { label: '審核中', color: '#1890ff', bg: '#e6f7ff' },
  approved: { label: '已核准', color: '#52c41a', bg: '#f6ffed' },
  rejected: { label: '已駁回', color: '#ff4d4f', bg: '#fff2f0' },
  active: { label: '生效中', color: '#13c2c2', bg: '#e6fffb' },
  expired: { label: '已到期', color: '#fa8c16', bg: '#fff7e6' },
  terminated: { label: '已終止', color: '#722ed1', bg: '#f9f0ff' },
  archived: { label: '已歸檔', color: '#595959', bg: '#fafafa' },
};

export const CONTRACT_CATEGORIES = {
  purchase: '採購合約',
  service: '勞務合約',
  nda: '保密協議',
  lease: '租賃合約',
  sales: '銷售合約',
  general: '一般合約',
};

export const APPROVAL_ACTIONS = {
  approve: { label: '核准', color: '#52c41a' },
  reject: { label: '駁回', color: '#ff4d4f' },
  return: { label: '退回', color: '#faad14' },
};

export const STEP_STATUS = {
  pending: { label: '待審核', color: '#1890ff' },
  waiting: { label: '等待中', color: '#d9d9d9' },
  approved: { label: '已核准', color: '#52c41a' },
  rejected: { label: '已駁回', color: '#ff4d4f' },
  returned: { label: '已退回', color: '#faad14' },
  skipped: { label: '已跳過', color: '#8c8c8c' },
};

export const formatCurrency = (amount, currency = 'TWD') => {
  if (!amount) return '-';
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency', currency, minimumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('zh-TW');
};
