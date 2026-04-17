import React, { useState } from 'react';
import {
  Card,
  Descriptions,
  Steps,
  Button,
  Tag,
  Table,
  Timeline,
  Modal,
  Input,
  Select,
  Checkbox,
  Upload,
  Typography,
  Space,
  Row,
  Col,
  Spin,
  message,
  Divider,
  Popconfirm,
} from 'antd';
import {
  UploadOutlined,
  SendOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  StopOutlined,
  CheckCircleOutlined,
  FileWordOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { contractAPI, workflowAPI, templateAPI } from '../api/client';
import { CONTRACT_STAGES, CONTRACT_TYPES } from '../types/index';
import type { Contract, StageLog, ApprovalRecord, Document as DocType, Workflow } from '../types/index';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ContractDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [submitApprovalModalOpen, setSubmitApprovalModalOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | undefined>();
  const [uploadDocType, setUploadDocType] = useState('contract');
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [templateFields, setTemplateFields] = useState<
    { field_id: string; label: string; required: boolean; hint: string; prefilled_value: string }[]
  >([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [loadingFields, setLoadingFields] = useState(false);

  // Fetch contract
  const {
    data: contract,
    isLoading,
  } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractAPI.get(Number(id)).then((r) => r.data as Contract),
    enabled: !!id,
  });

  // Fetch workflows for submit-approval modal
  const { data: workflowsData } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowAPI.list().then((r) => r.data),
    enabled: submitApprovalModalOpen,
  });

  const workflows: Workflow[] = workflowsData?.items ?? workflowsData?.data ?? workflowsData ?? [];

  // Fetch templates list
  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templateAPI.list().then((r) => r.data),
    enabled: templateModalOpen,
  });
  const templates: { id: string; label: string; group: string; has_form_fields: boolean; note: string }[] =
    templatesData?.templates ?? templatesData ?? [];

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['contract', id] });

  // Mutations
  const advanceMutation = useMutation({
    mutationFn: () => contractAPI.advance(Number(id), comment || undefined),
    onSuccess: () => {
      message.success('已推進至下一階段');
      setAdvanceModalOpen(false);
      setComment('');
      refetch();
    },
    onError: () => message.error('操作失敗'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => contractAPI.reject(Number(id), comment),
    onSuccess: () => {
      message.success('已退回上一階段');
      setRejectModalOpen(false);
      setComment('');
      refetch();
    },
    onError: () => message.error('操作失敗'),
  });

  const voidMutation = useMutation({
    mutationFn: () => contractAPI.void(Number(id), voidReason),
    onSuccess: () => {
      message.success('合約已作廢');
      setVoidModalOpen(false);
      setVoidReason('');
      refetch();
    },
    onError: () => message.error('操作失敗'),
  });

  const submitApprovalMutation = useMutation({
    mutationFn: () => contractAPI.submitApproval(Number(id), selectedWorkflowId!),
    onSuccess: () => {
      message.success('已送出簽呈');
      setSubmitApprovalModalOpen(false);
      setSelectedWorkflowId(undefined);
      refetch();
    },
    onError: () => message.error('操作失敗'),
  });

  const stampMutation = useMutation({
    mutationFn: (data: Record<string, boolean>) => contractAPI.stamp(Number(id), data),
    onSuccess: () => {
      message.success('用印狀態已更新');
      refetch();
    },
    onError: () => message.error('操作失敗'),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => contractAPI.upload(Number(id), file, uploadDocType),
    onSuccess: () => {
      message.success('文件已上傳');
      refetch();
    },
    onError: () => message.error('上傳失敗'),
  });

  // Template generation
  const generateMutation = useMutation({
    mutationFn: () =>
      templateAPI.generate(Number(id), selectedTemplateId!, fieldValues, true),
    onSuccess: (res) => {
      message.success(`合約文件已產生：${res.data.filename}`);
      setTemplateModalOpen(false);
      setSelectedTemplateId(undefined);
      setTemplateFields([]);
      setFieldValues({});
      refetch();
      // Auto download
      if (res.data.document_id) {
        templateAPI.downloadDocument(res.data.document_id).then((dlRes) => {
          const url = window.URL.createObjectURL(new Blob([dlRes.data]));
          const a = document.createElement('a');
          a.href = url;
          a.download = res.data.filename;
          a.click();
          window.URL.revokeObjectURL(url);
        });
      }
    },
    onError: () => message.error('產生合約文件失敗'),
  });

  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    setLoadingFields(true);
    try {
      const res = await templateAPI.preview(Number(id), templateId);
      const fields = res.data.fields ?? [];
      setTemplateFields(fields);
      const values: Record<string, string> = {};
      fields.forEach((f: { field_id: string; prefilled_value: string }) => {
        if (f.prefilled_value) values[f.field_id] = f.prefilled_value;
      });
      setFieldValues(values);
    } catch {
      message.error('無法取得範本欄位');
      setTemplateFields([]);
    }
    setLoadingFields(false);
  };

  if (isLoading || !contract) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  const c = contract;
  const stageInfo = CONTRACT_STAGES[c.current_stage];

  // Build ordered stages for Steps (exclude void)
  const orderedStages = Object.entries(CONTRACT_STAGES)
    .filter(([, v]) => v.order > 0)
    .sort(([, a], [, b]) => a.order - b.order);

  const currentStageIndex = orderedStages.findIndex(([key]) => key === c.current_stage);

  const stepsItems = orderedStages.map(([, val]) => ({
    title: val.label,
  }));

  // Approval records
  const approvals: ApprovalRecord[] = c.approvals ?? [];
  const approvalStatusMap: Record<string, { label: string; color: string }> = {
    pending:  { label: '待審核', color: 'default' },
    waiting:  { label: '等待中', color: 'default' },
    approved: { label: '已核准', color: 'green' },
    rejected: { label: '已駁回', color: 'red' },
  };
  const approvalColumns = [
    {
      title: '階段',
      dataIndex: 'stage',
      key: 'stage',
      width: 140,
      render: (v: string) => {
        const stage = CONTRACT_STAGES[v];
        return <Tag color={stage?.color}>{stage?.label ?? v}</Tag>;
      },
    },
    { title: '順序', dataIndex: 'step_order', key: 'step_order', width: 60 },
    { title: '步驟名稱', dataIndex: 'step_name', key: 'step_name' },
    { title: '簽核者', dataIndex: 'approver_name', key: 'approver_name' },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => {
        const s = approvalStatusMap[v];
        return <Tag color={s?.color ?? 'default'}>{s?.label ?? v}</Tag>;
      },
    },
    { title: '備註', dataIndex: 'comment', key: 'comment' },
    {
      title: '時間',
      dataIndex: 'acted_at',
      key: 'acted_at',
      render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
  ];

  // Stage logs for Timeline
  const stageLogs: StageLog[] = c.stage_logs ?? [];

  // Documents
  const documents: DocType[] = c.documents ?? [];
  const docColumns = [
    { title: '類型', dataIndex: 'doc_type', key: 'doc_type' },
    { title: '檔名', dataIndex: 'filename', key: 'filename' },
    {
      title: '大小',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (v: number) => (v ? `${(v / 1024).toFixed(1)} KB` : '-'),
    },
    { title: '階段', dataIndex: 'stage', key: 'stage', render: (v: string) => CONTRACT_STAGES[v]?.label ?? v },
    { title: '上傳者', dataIndex: 'uploader_name', key: 'uploader_name' },
    { title: '版本', dataIndex: 'version', key: 'version' },
    {
      title: '上傳時間',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
  ];

  const isVoid = c.current_stage === 'void';

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              {c.contract_no}
            </Title>
            <Tag color={stageInfo?.color}>{stageInfo?.label ?? c.current_stage}</Tag>
          </Space>
        </Col>
        <Col>
          {c.current_stage === 'draft' && (
            <Button onClick={() => navigate(`/contracts/${id}/edit`)}>編輯</Button>
          )}
        </Col>
      </Row>

      {/* 1. Contract Info */}
      <Card title="合約資訊" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2, lg: 3 }}>
          <Descriptions.Item label="合約名稱">{c.title}</Descriptions.Item>
          <Descriptions.Item label="合約類型">
            {CONTRACT_TYPES[c.contract_type] ?? c.contract_type}
          </Descriptions.Item>
          <Descriptions.Item label="合約格式">
            {c.contract_format === 'standard' ? '制式合約' : '非制式合約'}
          </Descriptions.Item>
          <Descriptions.Item label="廠商">{c.vendor_name ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="金額">
            {c.amount != null ? `${c.currency} ${c.amount.toLocaleString()}` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="需求部門">{c.requester_dept ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="專案名稱">{c.project_name ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="合約起始日">{c.start_date ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="合約結束日">{c.end_date ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="建立者">{c.creator_name ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="用印份數">{c.stamp_copies}</Descriptions.Item>
          <Descriptions.Item label="需 ROI">{c.roi_required ? '是' : '否'}</Descriptions.Item>
          <Descriptions.Item label="需智財通知">
            {c.ip_notification_required ? '是' : '否'}
          </Descriptions.Item>
          <Descriptions.Item label="建立時間">
            {dayjs(c.created_at).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="更新時間">
            {dayjs(c.updated_at).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          {c.description && (
            <Descriptions.Item label="說明" span={3}>
              {c.description}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* 2. Stage Progress */}
      <Card title="流程進度" style={{ marginBottom: 16 }}>
        <Steps
          current={isVoid ? undefined : currentStageIndex}
          status={isVoid ? 'error' : 'process'}
          items={stepsItems}
          size="small"
          style={{ overflowX: 'auto' }}
        />
        {isVoid && (
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <Tag color="red" style={{ fontSize: 14, padding: '4px 12px' }}>
              已作廢：{c.void_reason}
            </Tag>
          </div>
        )}
      </Card>

      {/* 3. Current Stage Actions */}
      {!isVoid && (
        <Card title="階段操作" style={{ marginBottom: 16 }}>
          <Space wrap>
            {c.current_stage === 'draft' && (
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => setSubmitApprovalModalOpen(true)}
              >
                送出簽呈
              </Button>
            )}
            <Button
              icon={<ArrowRightOutlined />}
              onClick={() => setAdvanceModalOpen(true)}
            >
              推進至下一階段
            </Button>
            <Button
              icon={<ArrowLeftOutlined />}
              danger
              onClick={() => setRejectModalOpen(true)}
            >
              退回上一階段
            </Button>
            <Popconfirm
              title="確定要作廢此合約嗎？"
              onConfirm={() => setVoidModalOpen(true)}
              okText="確定"
              cancelText="取消"
            >
              <Button icon={<StopOutlined />} danger>
                作廢
              </Button>
            </Popconfirm>
          </Space>

          {c.current_stage === 'stamping' && (
            <>
              <Divider />
              <Space direction="vertical">
                <Text strong>用印作業</Text>
                <Checkbox
                  checked={c.internal_stamp_done}
                  onChange={(e) =>
                    stampMutation.mutate({
                      internal_stamp_done: e.target.checked,
                      vendor_stamp_done: c.vendor_stamp_done,
                    })
                  }
                >
                  內部用印完成
                </Checkbox>
                <Checkbox
                  checked={c.vendor_stamp_done}
                  onChange={(e) =>
                    stampMutation.mutate({
                      internal_stamp_done: c.internal_stamp_done,
                      vendor_stamp_done: e.target.checked,
                    })
                  }
                >
                  廠商用印完成
                </Checkbox>
              </Space>
            </>
          )}
        </Card>
      )}

      {/* 4. Approval Records */}
      <Card title="簽核紀錄" style={{ marginBottom: 16 }}>
        <Table
          rowKey="id"
          columns={approvalColumns}
          dataSource={approvals}
          pagination={false}
          size="small"
          locale={{ emptyText: '尚無簽核紀錄' }}
        />
      </Card>

      {/* 5. Stage History Timeline */}
      <Card title="階段歷程" style={{ marginBottom: 16 }}>
        {stageLogs.length > 0 ? (
          <Timeline
            items={stageLogs.map((log) => ({
              color: CONTRACT_STAGES[log.to_stage]?.color ?? 'gray',
              children: (
                <div>
                  <Space>
                    {log.from_stage && (
                      <Tag>{CONTRACT_STAGES[log.from_stage]?.label ?? log.from_stage}</Tag>
                    )}
                    {log.from_stage && <span>→</span>}
                    <Tag color={CONTRACT_STAGES[log.to_stage]?.color}>
                      {CONTRACT_STAGES[log.to_stage]?.label ?? log.to_stage}
                    </Tag>
                  </Space>
                  <div>
                    <Text type="secondary">
                      {log.operator_name} | {dayjs(log.created_at).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </div>
                  {log.comment && <div style={{ marginTop: 4 }}>{log.comment}</div>}
                </div>
              ),
            }))}
          />
        ) : (
          <Text type="secondary">尚無歷程紀錄</Text>
        )}
      </Card>

      {/* 6. Documents */}
      <Card title="相關文件" style={{ marginBottom: 16 }}>
        <Row gutter={12} style={{ marginBottom: 12 }}>
          <Col>
            <Select
              value={uploadDocType}
              onChange={setUploadDocType}
              style={{ width: 160 }}
              options={[
                { label: '合約文件', value: 'contract' },
                { label: '簽呈', value: 'approval_memo' },
                { label: '請購單', value: 'purchase_request' },
                { label: '決購建議表', value: 'purchase_decision' },
                { label: 'ROI 報告', value: 'roi_report' },
                { label: '其他', value: 'other' },
              ]}
            />
          </Col>
          <Col>
            <Upload
              showUploadList={false}
              beforeUpload={(file) => {
                uploadMutation.mutate(file);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />} loading={uploadMutation.isPending}>
                上傳文件
              </Button>
            </Upload>
          </Col>
        </Row>
        <Table
          rowKey="id"
          columns={docColumns}
          dataSource={documents}
          pagination={false}
          size="small"
          locale={{ emptyText: '尚無文件' }}
        />
      </Card>

      {/* 7. Generate Contract Template */}
      <Card title="產生合約文件" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary">
            從 ibon 制式合約範本產生文件，系統將自動帶入合約及廠商資料。
          </Text>
          <Button
            type="primary"
            icon={<FileWordOutlined />}
            onClick={() => setTemplateModalOpen(true)}
          >
            選擇範本並產生文件
          </Button>
        </Space>
      </Card>

      {/* Modals */}

      {/* Advance modal */}
      <Modal
        title="推進至下一階段"
        open={advanceModalOpen}
        onOk={() => advanceMutation.mutate()}
        onCancel={() => {
          setAdvanceModalOpen(false);
          setComment('');
        }}
        confirmLoading={advanceMutation.isPending}
        okText="確認推進"
        cancelText="取消"
      >
        <TextArea
          rows={3}
          placeholder="備註（選填）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Modal>

      {/* Reject modal */}
      <Modal
        title="退回上一階段"
        open={rejectModalOpen}
        onOk={() => {
          if (!comment.trim()) {
            message.warning('退回原因為必填');
            return;
          }
          rejectMutation.mutate();
        }}
        onCancel={() => {
          setRejectModalOpen(false);
          setComment('');
        }}
        confirmLoading={rejectMutation.isPending}
        okText="確認退回"
        cancelText="取消"
      >
        <TextArea
          rows={3}
          placeholder="退回原因（必填）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Modal>

      {/* Void modal */}
      <Modal
        title="作廢合約"
        open={voidModalOpen}
        onOk={() => {
          if (!voidReason.trim()) {
            message.warning('作廢原因為必填');
            return;
          }
          voidMutation.mutate();
        }}
        onCancel={() => {
          setVoidModalOpen(false);
          setVoidReason('');
        }}
        confirmLoading={voidMutation.isPending}
        okText="確認作廢"
        okButtonProps={{ danger: true }}
        cancelText="取消"
      >
        <TextArea
          rows={3}
          placeholder="作廢原因（必填）"
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
        />
      </Modal>

      {/* Submit approval modal */}
      <Modal
        title="送出簽呈"
        open={submitApprovalModalOpen}
        onOk={() => {
          if (!selectedWorkflowId) {
            message.warning('請選擇簽核流程');
            return;
          }
          submitApprovalMutation.mutate();
        }}
        onCancel={() => {
          setSubmitApprovalModalOpen(false);
          setSelectedWorkflowId(undefined);
        }}
        confirmLoading={submitApprovalMutation.isPending}
        okText="送出"
        cancelText="取消"
      >
        <Select
          placeholder="選擇簽核流程"
          style={{ width: '100%' }}
          value={selectedWorkflowId}
          onChange={setSelectedWorkflowId}
          options={workflows.map((w) => ({
            label: `${w.name}（${CONTRACT_STAGES[w.stage]?.label ?? w.stage}）`,
            value: w.id,
          }))}
        />
      </Modal>

      {/* Template generation modal */}
      <Modal
        title="產生合約文件"
        open={templateModalOpen}
        width={720}
        onOk={() => {
          if (!selectedTemplateId) {
            message.warning('請選擇範本');
            return;
          }
          generateMutation.mutate();
        }}
        onCancel={() => {
          setTemplateModalOpen(false);
          setSelectedTemplateId(undefined);
          setTemplateFields([]);
          setFieldValues({});
        }}
        confirmLoading={generateMutation.isPending}
        okText="產生文件"
        okButtonProps={{ icon: <DownloadOutlined /> }}
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>選擇範本：</Text>
            <Select
              placeholder="選擇合約範本"
              style={{ width: '100%', marginTop: 8 }}
              value={selectedTemplateId}
              onChange={handleTemplateSelect}
              showSearch
              optionFilterProp="label"
              options={templates.map((t) => ({
                label: t.label,
                value: t.id,
              }))}
            />
          </div>

          {loadingFields && <Spin tip="載入欄位中..." />}

          {templateFields.length > 0 && (
            <div>
              <Divider orientation="left">欄位填寫（已自動帶入合約資料）</Divider>
              {templateFields.map((f) => (
                <div key={f.field_id} style={{ marginBottom: 12 }}>
                  <Text>
                    {f.label}
                    {f.required && <span style={{ color: 'red' }}> *</span>}
                  </Text>
                  <Input
                    value={fieldValues[f.field_id] ?? ''}
                    placeholder={f.hint || f.label}
                    onChange={(e) =>
                      setFieldValues((prev) => ({
                        ...prev,
                        [f.field_id]: e.target.value,
                      }))
                    }
                    style={{ marginTop: 4 }}
                  />
                </div>
              ))}
            </div>
          )}

          {selectedTemplateId && templateFields.length === 0 && !loadingFields && (
            <Text type="secondary">
              此範本無表單欄位，將直接複製空白範本。
            </Text>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default ContractDetail;
