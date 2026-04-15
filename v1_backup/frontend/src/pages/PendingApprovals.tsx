import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Space, Tag, Modal, Input, message, Checkbox } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalAPI } from '../api/client';
import ContractStatusBadge from '../components/ContractStatusBadge';
import type { PendingItem } from '../types';

const typeLabels: Record<string, string> = { purchase: '採購', nda: 'NDA', service: '勞務', sales: '銷售', other: '其他' };

export default function PendingApprovals() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [rejectModal, setRejectModal] = useState<{ contractId: number } | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: () => approvalAPI.pending().then(r => r.data as PendingItem[]),
  });

  const approveMut = useMutation({
    mutationFn: (contractId: number) => approvalAPI.approve(contractId),
    onSuccess: () => { message.success('已核准'); queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] }); },
    onError: (e: any) => message.error(e.response?.data?.detail || '操作失敗'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) => approvalAPI.reject(id, comment),
    onSuccess: () => { message.success('已退回'); setRejectModal(null); setRejectComment(''); queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] }); },
    onError: (e: any) => message.error(e.response?.data?.detail || '操作失敗'),
  });

  const batchMut = useMutation({
    mutationFn: () => approvalAPI.batchApprove(selected),
    onSuccess: () => { message.success(`已批次核准 ${selected.length} 筆`); setSelected([]); queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] }); },
  });

  const columns = [
    { title: '合約編號', dataIndex: 'contract_no', render: (v: string, r: PendingItem) => <a onClick={() => navigate(`/contracts/${r.contract_id}`)}>{v}</a> },
    { title: '標題', dataIndex: 'title', ellipsis: true },
    { title: '對象', dataIndex: 'counterparty' },
    { title: '金額', dataIndex: 'amount', render: (v: number) => v ? `$${v.toLocaleString()}` : '-' },
    { title: '類型', dataIndex: 'contract_type', render: (v: string) => typeLabels[v] || v },
    { title: '步驟', render: (_: any, r: PendingItem) => <Tag color="blue">第 {r.step_order}/{r.total_steps} 關</Tag> },
    { title: '申請人', dataIndex: 'creator_name' },
    {
      title: '操作', width: 180, render: (_: any, r: PendingItem) => (
        <Space>
          <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => approveMut.mutate(r.contract_id)}>核准</Button>
          <Button danger size="small" icon={<CloseOutlined />} onClick={() => setRejectModal({ contractId: r.contract_id })}>退回</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title={`待我簽核 (${data?.length || 0} 筆)`}
        extra={selected.length > 0 && (
          <Button type="primary" onClick={() => batchMut.mutate()}>批次核准 ({selected.length})</Button>
        )}
      >
        <Table
          rowKey="record_id"
          columns={columns}
          dataSource={data || []}
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          rowSelection={{
            selectedRowKeys: selected,
            onChange: (keys) => setSelected(keys as number[]),
          }}
          onRow={(r) => ({ onClick: () => navigate(`/contracts/${r.contract_id}`) })}
          locale={{ emptyText: '目前沒有待審核的合約' }}
        />
      </Card>

      <Modal
        title="退回原因"
        open={!!rejectModal}
        onCancel={() => { setRejectModal(null); setRejectComment(''); }}
        onOk={() => rejectModal && rejectMut.mutate({ id: rejectModal.contractId, comment: rejectComment })}
        okText="確認退回"
        okButtonProps={{ danger: true, disabled: rejectComment.length < 2 }}
      >
        <Input.TextArea
          rows={3}
          value={rejectComment}
          onChange={(e) => setRejectComment(e.target.value)}
          placeholder="請填寫退回原因（必填）"
        />
      </Modal>
    </>
  );
}
