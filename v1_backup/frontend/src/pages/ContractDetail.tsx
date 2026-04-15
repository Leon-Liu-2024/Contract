import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Descriptions,
  Card,
  Button,
  Space,
  Modal,
  Select,
  Input,
  Tag,
  message,
  Upload,
  Divider,
  List,
  Spin,
} from 'antd';
import {
  EditOutlined,
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
  StopOutlined,
  BellOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { contractAPI, approvalAPI, workflowAPI } from '../api/client';
import { useAuthStore } from '../store/authStore';
import ContractStatusBadge from '../components/ContractStatusBadge';
import ApprovalTimeline from '../components/ApprovalTimeline';
import type { Contract, Workflow, Attachment } from '../types';

const contractTypeLabels: Record<string, string> = {
  purchase: '採購合約',
  nda: '保密協議',
  service: '勞務合約',
  sales: '銷售合約',
  other: '其他',
};

export default function ContractDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const contractId = Number(id);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { data: contract, isLoading } = useQuery<Contract>({
    queryKey: ['contract', contractId],
    queryFn: async () => {
      const res = await contractAPI.get(contractId);
      return res.data;
    },
    enabled: !!contractId,
  });

  const { data: workflowsData } = useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: async () => {
      const res = await workflowAPI.list();
      return res.data;
    },
    enabled: submitModalOpen,
  });

  const workflows = workflowsData || [];

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
  };

  // Check if user is the current approver
  const isCurrentApprover = (): boolean => {
    if (!contract || !user || !contract.approval_records) return false;
    return contract.approval_records.some(
      (r) => r.approver_id === user.id && r.status === 'pending'
    );
  };

  const isAdminOrManager = (): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager';
  };

  // Actions
  const handleSubmitApproval = async () => {
    if (!selectedWorkflowId) {
      message.warning('請選擇簽核流程');
      return;
    }
    setActionLoading(true);
    try {
      await approvalAPI.submit(contractId, selectedWorkflowId);
      message.success('已送出簽核');
      setSubmitModalOpen(false);
      setSelectedWorkflowId(null);
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        '送出簽核失敗';
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await approvalAPI.approve(contractId);
      message.success('已同意');
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        '操作失敗';
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      message.warning('請輸入退回原因');
      return;
    }
    setActionLoading(true);
    try {
      await approvalAPI.reject(contractId, rejectComment);
      message.success('已退回');
      setRejectModalOpen(false);
      setRejectComment('');
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        '操作失敗';
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemind = async () => {
    try {
      await approvalAPI.remind(contractId);
      message.success('已發送催簽通知');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        '催簽失敗';
      message.error(msg);
    }
  };

  const handleVoid = async () => {
    if (!voidReason.trim()) {
      message.warning('請輸入作廢原因');
      return;
    }
    setActionLoading(true);
    try {
      await contractAPI.void(contractId, voidReason);
      message.success('合約已作廢');
      setVoidModalOpen(false);
      setVoidReason('');
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        '作廢失敗';
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      await contractAPI.uploadFile(contractId, file);
      message.success('檔案上傳成功');
      refetch();
    } catch {
      message.error('檔案上傳失敗');
    }
    return false; // prevent default upload
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const res = await contractAPI.downloadFile(contractId, attachment.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('下載失敗');
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!contract) {
    return <Card>找不到此合約</Card>;
  }

  const status = contract.status;

  return (
    <div>
      {/* Contract Info */}
      <Card
        title="合約詳情"
        extra={
          <Button onClick={() => navigate('/contracts')}>返回列表</Button>
        }
      >
        <Descriptions bordered column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="合約編號">{contract.contract_no}</Descriptions.Item>
          <Descriptions.Item label="合約名稱">{contract.title}</Descriptions.Item>
          <Descriptions.Item label="對方單位">{contract.counterparty || '-'}</Descriptions.Item>
          <Descriptions.Item label="金額">
            {contract.amount != null
              ? `NT$ ${contract.amount.toLocaleString('zh-TW')}`
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="合約類型">
            {contract.contract_type ? (
              <Tag>{contractTypeLabels[contract.contract_type] || contract.contract_type}</Tag>
            ) : (
              '-'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="狀態">
            <ContractStatusBadge status={status} />
          </Descriptions.Item>
          <Descriptions.Item label="開始日期">
            {contract.start_date || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="結束日期">
            {contract.end_date || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="建立者">
            {contract.creator_name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="建立時間">
            {contract.created_at
              ? new Date(contract.created_at).toLocaleString('zh-TW')
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="更新時間">
            {contract.updated_at
              ? new Date(contract.updated_at).toLocaleString('zh-TW')
              : '-'}
          </Descriptions.Item>
          {status === 'void' && (
            <Descriptions.Item label="作廢原因" span={2}>
              <span style={{ color: '#ff4d4f' }}>{contract.void_reason}</span>
            </Descriptions.Item>
          )}
        </Descriptions>

        {/* Action Buttons */}
        <Divider />
        <Space wrap>
          {(status === 'draft' || status === 'rejected') && (
            <>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => setSubmitModalOpen(true)}
              >
                送出簽核
              </Button>
              <Button
                icon={<EditOutlined />}
                onClick={() => navigate(`/contracts/${contractId}/edit`)}
              >
                編輯
              </Button>
            </>
          )}

          {status === 'pending' && (
            <Button icon={<BellOutlined />} onClick={handleRemind}>
              催簽
            </Button>
          )}

          {status === 'pending' && isCurrentApprover() && (
            <>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleApprove}
                loading={actionLoading}
              >
                同意
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => setRejectModalOpen(true)}
              >
                退回
              </Button>
            </>
          )}

          {status !== 'void' && isAdminOrManager() && (
            <Button
              danger
              icon={<StopOutlined />}
              onClick={() => setVoidModalOpen(true)}
            >
              作廢
            </Button>
          )}
        </Space>
      </Card>

      {/* Approval Timeline */}
      {contract.approval_records && contract.approval_records.length > 0 && (
        <Card title="簽核進度" style={{ marginTop: 16 }}>
          <ApprovalTimeline records={contract.approval_records} />
        </Card>
      )}

      {/* Attachments */}
      <Card title="附件" style={{ marginTop: 16 }}>
        <List
          dataSource={contract.attachments || []}
          locale={{ emptyText: '尚無附件' }}
          renderItem={(item: Attachment) => (
            <List.Item
              actions={[
                <Button
                  key="download"
                  type="link"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload(item)}
                >
                  下載
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={item.filename}
                description={`大小: ${(item.file_size / 1024).toFixed(1)} KB${
                  item.uploaded_at
                    ? ` | 上傳時間: ${new Date(item.uploaded_at).toLocaleString('zh-TW')}`
                    : ''
                }`}
              />
            </List.Item>
          )}
        />
        {status !== 'void' && (
          <>
            <Divider />
            <Upload
              beforeUpload={(file) => handleUpload(file)}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>上傳附件</Button>
            </Upload>
          </>
        )}
      </Card>

      {/* Submit Approval Modal */}
      <Modal
        title="選擇簽核流程"
        open={submitModalOpen}
        onOk={handleSubmitApproval}
        onCancel={() => {
          setSubmitModalOpen(false);
          setSelectedWorkflowId(null);
        }}
        confirmLoading={actionLoading}
        okText="送出"
        cancelText="取消"
      >
        <p>請選擇要使用的簽核流程：</p>
        <Select
          placeholder="選擇簽核流程"
          style={{ width: '100%' }}
          value={selectedWorkflowId}
          onChange={(val) => setSelectedWorkflowId(val)}
          options={workflows.map((w) => ({
            value: w.id,
            label: `${w.name}${w.contract_type ? ` (${contractTypeLabels[w.contract_type] || w.contract_type})` : ''}`,
          }))}
        />
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="退回合約"
        open={rejectModalOpen}
        onOk={handleReject}
        onCancel={() => {
          setRejectModalOpen(false);
          setRejectComment('');
        }}
        confirmLoading={actionLoading}
        okText="確認退回"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>請輸入退回原因：</p>
        <Input.TextArea
          rows={4}
          value={rejectComment}
          onChange={(e) => setRejectComment(e.target.value)}
          placeholder="請說明退回原因"
        />
      </Modal>

      {/* Void Modal */}
      <Modal
        title="作廢合約"
        open={voidModalOpen}
        onOk={handleVoid}
        onCancel={() => {
          setVoidModalOpen(false);
          setVoidReason('');
        }}
        confirmLoading={actionLoading}
        okText="確認作廢"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>請輸入作廢原因：</p>
        <Input.TextArea
          rows={4}
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
          placeholder="請說明作廢原因"
        />
      </Modal>
    </div>
  );
}
