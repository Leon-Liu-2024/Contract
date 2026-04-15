import { useNavigate } from 'react-router-dom';
import { Card, Table } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { contractAPI } from '../api/client';
import ContractStatusBadge from '../components/ContractStatusBadge';

export default function CompletedContracts() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['contracts', 'approved'],
    queryFn: () => contractAPI.list({ status: 'approved' }).then(r => r.data),
  });

  const columns = [
    { title: '合約編號', dataIndex: 'contract_no', render: (v: string, r: any) => <a onClick={() => navigate(`/contracts/${r.id}`)}>{v}</a> },
    { title: '標題', dataIndex: 'title', ellipsis: true },
    { title: '對象', dataIndex: 'counterparty' },
    { title: '金額', dataIndex: 'amount', render: (v: number) => v ? `$${v.toLocaleString()}` : '-' },
    { title: '狀態', dataIndex: 'status', render: (v: string) => <ContractStatusBadge status={v} /> },
    { title: '完成時間', dataIndex: 'updated_at', render: (v: string) => v ? new Date(v).toLocaleDateString('zh-TW') : '-' },
  ];

  return (
    <Card title={`已完成合約 (${data?.total || 0} 筆)`}>
      <Table rowKey="id" columns={columns} dataSource={data?.data || []} loading={isLoading}
        pagination={{ pageSize: 20 }}
        onRow={(r) => ({ onClick: () => navigate(`/contracts/${r.id}`), style: { cursor: 'pointer' } })}
        locale={{ emptyText: '尚無已完成的合約' }}
      />
    </Card>
  );
}
