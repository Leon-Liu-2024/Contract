import { Steps, Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, SyncOutlined } from '@ant-design/icons';
import type { ApprovalRecord } from '../types';

const statusMap: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  approved: { color: 'success', icon: <CheckCircleOutlined />, label: '已核准' },
  rejected: { color: 'error', icon: <CloseCircleOutlined />, label: '已退回' },
  pending: { color: 'processing', icon: <SyncOutlined spin />, label: '待審核' },
  waiting: { color: 'default', icon: <ClockCircleOutlined />, label: '等待中' },
};

interface Props {
  records: ApprovalRecord[];
}

export default function ApprovalTimeline({ records }: Props) {
  if (!records || records.length === 0) return null;

  // 依 step_order 分組
  const grouped = new Map<number, ApprovalRecord[]>();
  records.forEach(r => {
    const order = r.step_order || 0;
    if (!grouped.has(order)) grouped.set(order, []);
    grouped.get(order)!.push(r);
  });

  const steps = Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([order, recs]) => {
      const isCountersign = recs.length > 1;
      const allApproved = recs.every(r => r.status === 'approved');
      const anyRejected = recs.some(r => r.status === 'rejected');
      const anyPending = recs.some(r => r.status === 'pending');

      const overallStatus = anyRejected ? 'rejected' : allApproved ? 'approved' : anyPending ? 'pending' : 'waiting';
      const info = statusMap[overallStatus] || statusMap.waiting;

      const description = recs.map(r => {
        const s = statusMap[r.status] || statusMap.waiting;
        return (
          <div key={r.id} style={{ marginBottom: 4 }}>
            <Tag color={s.color}>{s.label}</Tag>
            <span>{r.approver_name || `使用者 #${r.approver_id}`}</span>
            {isCountersign && <Tag style={{ marginLeft: 4 }}>會簽</Tag>}
            {r.comment && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>「{r.comment}」</div>}
            {r.acted_at && <div style={{ fontSize: 11, color: '#999' }}>{new Date(r.acted_at).toLocaleString('zh-TW')}</div>}
          </div>
        );
      });

      return {
        title: `第 ${order} 關`,
        description: <div>{description}</div>,
        status: (overallStatus === 'approved' ? 'finish' : overallStatus === 'pending' ? 'process' : overallStatus === 'rejected' ? 'error' : 'wait') as 'finish' | 'process' | 'error' | 'wait',
        icon: info.icon,
      };
    });

  return <Steps direction="vertical" size="small" items={steps} />;
}
