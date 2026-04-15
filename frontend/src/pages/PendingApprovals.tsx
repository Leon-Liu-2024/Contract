import React, { useState } from 'react';
import { Table, Button, Modal, Input, message, Space, Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { approvalAPI } from '../api/client';
import type { PendingApproval } from '../types/index';
import { CONTRACT_STAGES } from '../types/index';

const { TextArea } = Input;

const PendingApprovals: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [actionModal, setActionModal] = useState<{
    visible: boolean;
    type: 'approve' | 'reject';
    recordId: number | null;
  }>({ visible: false, type: 'approve', recordId: null });
  const [comment, setComment] = useState('');
  const [batchComment, setBatchComment] = useState('');
  const [batchModalVisible, setBatchModalVisible] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: () => approvalAPI.pending().then((res) => res.data as PendingApproval[]),
  });

  const extractErrorMessage = (err: unknown, fallback: string) => {
    const e = err as { response?: { data?: { detail?: unknown } } };
    const detail = e?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => (d as { msg?: string }).msg || JSON.stringify(d)).join('; ');
    }
    return fallback;
  };

  const approveMutation = useMutation({
    mutationFn: ({ recordId, comment }: { recordId: number; comment?: string }) =>
      approvalAPI.approve(recordId, comment),
    onSuccess: () => {
      message.success('已核准');
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      closeModal();
    },
    onError: (err) => message.error(extractErrorMessage(err, '核准失敗')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ recordId, comment }: { recordId: number; comment: string }) =>
      approvalAPI.reject(recordId, comment),
    onSuccess: () => {
      message.success('已駁回');
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      closeModal();
    },
    onError: (err) => message.error(extractErrorMessage(err, '駁回失敗')),
  });

  const batchApproveMutation = useMutation({
    mutationFn: ({ recordIds, comment }: { recordIds: number[]; comment?: string }) =>
      approvalAPI.batchApprove(recordIds, comment),
    onSuccess: () => {
      message.success('批次核准完成');
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      setSelectedRowKeys([]);
      setBatchModalVisible(false);
      setBatchComment('');
    },
    onError: (err) => message.error(extractErrorMessage(err, '批次核准失敗')),
  });

  const closeModal = () => {
    setActionModal({ visible: false, type: 'approve', recordId: null });
    setComment('');
  };

  const handleAction = () => {
    if (!actionModal.recordId) return;
    if (actionModal.type === 'approve') {
      approveMutation.mutate({ recordId: actionModal.recordId, comment: comment || undefined });
    } else {
      if (!comment.trim()) {
        message.warning('駁回時必須填寫意見');
        return;
      }
      rejectMutation.mutate({ recordId: actionModal.recordId, comment });
    }
  };

  const handleBatchApprove = () => {
    const ids = selectedRowKeys.map((k) => Number(k));
    batchApproveMutation.mutate({ recordIds: ids, comment: batchComment || undefined });
  };

  const columns = [
    { title: '合約編號', dataIndex: 'contract_no', key: 'contract_no', width: 140 },
    { title: '合約名稱', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: '金額',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (val: number | null) => (val != null ? val.toLocaleString() : '-'),
    },
    {
      title: '階段',
      dataIndex: 'stage_label',
      key: 'stage_label',
      width: 130,
      render: (label: string, record: PendingApproval) => {
        const stage = CONTRACT_STAGES[record.current_stage];
        return <Tag color={stage?.color}>{label}</Tag>;
      },
    },
    { title: '簽核關卡', dataIndex: 'step_name', key: 'step_name', width: 120 },
    { title: '申請人', dataIndex: 'creator_name', key: 'creator_name', width: 100 },
    {
      title: '建立時間',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: PendingApproval) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
            onClick={() =>
              setActionModal({ visible: true, type: 'approve', recordId: record.record_id })
            }
          >
            核准
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() =>
              setActionModal({ visible: true, type: 'reject', recordId: record.record_id })
            }
          >
            駁回
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>待簽核列表</h2>
        {selectedRowKeys.length > 0 && (
          <Button
            type="primary"
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
            onClick={() => setBatchModalVisible(true)}
          >
            批次核准 ({selectedRowKeys.length})
          </Button>
        )}
      </div>

      <Table
        rowKey="record_id"
        columns={columns}
        dataSource={data || []}
        loading={isLoading}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `共 ${t} 筆` }}
      />

      <Modal
        title={actionModal.type === 'approve' ? '核准確認' : '駁回確認'}
        open={actionModal.visible}
        onOk={handleAction}
        onCancel={closeModal}
        confirmLoading={approveMutation.isPending || rejectMutation.isPending}
        okText={actionModal.type === 'approve' ? '核准' : '駁回'}
        okButtonProps={
          actionModal.type === 'approve'
            ? { style: { background: '#52c41a', borderColor: '#52c41a' } }
            : { danger: true }
        }
      >
        <TextArea
          rows={4}
          placeholder={
            actionModal.type === 'approve' ? '簽核意見（選填）' : '駁回原因（必填）'
          }
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Modal>

      <Modal
        title="批次核准確認"
        open={batchModalVisible}
        onOk={handleBatchApprove}
        onCancel={() => {
          setBatchModalVisible(false);
          setBatchComment('');
        }}
        confirmLoading={batchApproveMutation.isPending}
        okText="批次核准"
        okButtonProps={{ style: { background: '#52c41a', borderColor: '#52c41a' } }}
      >
        <p>即將核准 {selectedRowKeys.length} 筆簽核項目</p>
        <TextArea
          rows={3}
          placeholder="簽核意見（選填）"
          value={batchComment}
          onChange={(e) => setBatchComment(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default PendingApprovals;
