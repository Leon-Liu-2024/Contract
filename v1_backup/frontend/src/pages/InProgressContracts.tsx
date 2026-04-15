import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Tag, message } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractAPI, approvalAPI } from '../api/client';
import ContractStatusBadge from '../components/ContractStatusBadge';

export default function InProgressContracts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', 'pending'],
    queryFn: () => contractAPI.list({ status: 'pending' }).then(r => r.data),
  });

  const remindMut = useMutation({
    mutationFn: (id: number) => approvalAPI.remind(id),
    onSuccess: () => { message.success('催簽通知已發送'); },
    onError: (e: any) => message.error(e.response?.data?.detail || '催簽失敗'),
  });

  const columns = [
    { title: '合約編號', dataIndex: 'contract_no', render: (v: string, r: any) => <a onClick={() => navigate(`/contracts/${r.id}`)}>{v}</a> },
    { title: '標題', dataIndex: 'title', ellipsis: true },
    { title: '對象', dataIndex: 'counterparty' },
    { title: '目前步驟', dataIndex: 'current_step', render: (v: number) => <Tag color="processing">第 {v} 關</Tag> },
    { title: '狀態', dataIndex: 'status', render: (v: string) => <ContractStatusBadge status={v} /> },
    { title: '更新時間', dataIndex: 'updated_at', render: (v: string) => v ? new Date(v).toLocaleDateString('zh-TW') : '-' },
    {
      title: '操作', width: 120, render: (_: any, r: any) => (
        <Button size="small" icon={<BellOutlined />} onClick={(e) => { e.stopPropagation(); remindMut.mutate(r.id); }}>催簽</Button>
      ),
    },
  ];

  return (
    <Card title={`我的簽核中合約 (${data?.total || 0} 筆)`}>
      <Table
        rowKey="id" columns={columns}
        dataSource={data?.data || []} loading={isLoading}
        pagination={{ pageSize: 20 }}
        onRow={(r) => ({ onClick: () => navigate(`/contracts/${r.id}`), style: { cursor: 'pointer' } })}
        locale={{ emptyText: '目前沒有簽核中的合約' }}
      />
    </Card>
  );
}
