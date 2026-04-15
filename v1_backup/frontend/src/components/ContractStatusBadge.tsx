import { Tag } from 'antd';

const statusConfig: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  pending: { color: 'processing', label: '簽核中' },
  approved: { color: 'success', label: '已核准' },
  rejected: { color: 'error', label: '已退回' },
  void: { color: '#8c8c8c', label: '已作廢' },
};

export default function ContractStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { color: 'default', label: status };
  return <Tag color={config.color}>{config.label}</Tag>;
}
