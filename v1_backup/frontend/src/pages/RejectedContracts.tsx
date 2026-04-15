import { useNavigate } from 'react-router-dom';
import { Card, Table, Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { contractAPI } from '../api/client';
import ContractStatusBadge from '../components/ContractStatusBadge';

export default function RejectedContracts() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['contracts', 'rejected'],
    queryFn: () => contractAPI.list({ status: 'rejected' }).then(r => r.data),
  });

  const columns = [
    { title: '合約編號', dataIndex: 'contract_no', render: (v: string, r: any) => <a onClick={() => navigate(`/contracts/${r.id}`)}>{v}</a> },
    { title: '標題', dataIndex: 'title', ellipsis: true },
    { title: '對象', dataIndex: 'counterparty' },
    { title: '狀態', dataIndex: 'status', render: (v: string) => <ContractStatusBadge status={v} /> },
    { title: '更新時間', dataIndex: 'updated_at', render: (v: string) => v ? new Date(v).toLocaleDateString('zh-TW') : '-' },
    {
      title: '操作', width: 140, render: (_: any, r: any) => (
        <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${r.id}/edit`); }}>
          修改重送
        </Button>
      ),
    },
  ];

  return (
    <Card title={`已退回合約 (${data?.total || 0} 筆)`}>
      <Table rowKey="id" columns={columns} dataSource={data?.data || []} loading={isLoading}
        pagination={{ pageSize: 20 }}
        onRow={(r) => ({ onClick: () => navigate(`/contracts/${r.id}`), style: { cursor: 'pointer' } })}
        locale={{ emptyText: '沒有被退回的合約' }}
      />
    </Card>
  );
}
