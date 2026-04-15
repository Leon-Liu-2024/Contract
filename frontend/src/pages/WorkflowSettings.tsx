import React, { useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag, message, Space, Popconfirm, InputNumber, Card,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowAPI, userAPI } from '../api/client';
import type { Workflow, UserProfile } from '../types/index';
import { CONTRACT_STAGES, CONTRACT_TYPES } from '../types/index';

interface StepFormItem {
  step_order: number;
  step_type: string;
  step_name: string;
  approver_id: number | null;
}

const WorkflowSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [steps, setSteps] = useState<StepFormItem[]>([]);

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowAPI.list().then((res) => res.data as Workflow[]),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => userAPI.list().then((res) => res.data as UserProfile[]),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => workflowAPI.create(data),
    onSuccess: () => {
      message.success('新增流程成功');
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      closeModal();
    },
    onError: () => message.error('新增流程失敗'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      workflowAPI.update(id, data),
    onSuccess: () => {
      message.success('更新流程成功');
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      closeModal();
    },
    onError: () => message.error('更新流程失敗'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => workflowAPI.delete(id),
    onSuccess: () => {
      message.success('刪除流程成功');
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: () => message.error('刪除流程失敗'),
  });

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    form.resetFields();
    setSteps([]);
  };

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    setSteps([{ step_order: 1, step_type: 'sequential', step_name: '', approver_id: null }]);
    setModalVisible(true);
  };

  const openEdit = (record: Workflow) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      stage: record.stage,
      contract_type: record.contract_type,
    });
    setSteps(
      record.steps.map((s) => ({
        step_order: s.step_order,
        step_type: s.step_type,
        step_name: s.step_name || '',
        approver_id: s.approver_id,
      }))
    );
    setModalVisible(true);
  };

  const addStep = () => {
    const nextOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.step_order)) + 1 : 1;
    setSteps([...steps, { step_order: nextOrder, step_type: 'sequential', step_name: '', approver_id: null }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof StepFormItem, value: unknown) => {
    const updated = [...steps];
    (updated[index] as Record<string, unknown>)[field] = value;
    setSteps(updated);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (steps.length === 0) {
        message.warning('請至少新增一個簽核關卡');
        return;
      }
      const payload = { ...values, steps };
      if (editingId) {
        updateMutation.mutate({ id: editingId, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    });
  };

  const stageOptions = Object.entries(CONTRACT_STAGES)
    .filter(([key]) => key !== 'void')
    .map(([key, val]) => ({ value: key, label: val.label }));

  const typeOptions = Object.entries(CONTRACT_TYPES).map(([key, label]) => ({
    value: key,
    label,
  }));

  const userOptions = (users || []).map((u) => ({ value: u.id, label: `${u.name} (${u.department || ''})` }));

  const columns = [
    { title: '流程名稱', dataIndex: 'name', key: 'name', ellipsis: true },
    {
      title: '階段',
      dataIndex: 'stage',
      key: 'stage',
      width: 140,
      render: (val: string) => {
        const stage = CONTRACT_STAGES[val];
        return stage ? <Tag color={stage.color}>{stage.label}</Tag> : val;
      },
    },
    {
      title: '合約類型',
      dataIndex: 'contract_type',
      key: 'contract_type',
      width: 140,
      render: (val: string | null) => (val ? CONTRACT_TYPES[val] || val : '-'),
    },
    {
      title: '啟用',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (val: boolean) => <Tag color={val ? 'green' : 'default'}>{val ? '啟用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_: unknown, record: Workflow) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            編輯
          </Button>
          <Popconfirm
            title="確定要刪除此流程？"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="確定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>簽核流程設定</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增流程
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={workflows || []}
        loading={isLoading}
        pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `共 ${t} 筆` }}
      />

      <Modal
        title={editingId ? '編輯流程' : '新增流程'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText="儲存"
        cancelText="取消"
        width={720}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="流程名稱"
            rules={[{ required: true, message: '請輸入流程名稱' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="stage"
            label="適用階段"
            rules={[{ required: true, message: '請選擇適用階段' }]}
          >
            <Select options={stageOptions} placeholder="選擇階段" />
          </Form.Item>
          <Form.Item name="contract_type" label="合約類型（選填）">
            <Select options={typeOptions} placeholder="選擇合約類型" allowClear />
          </Form.Item>
        </Form>

        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>簽核關卡</strong>
          <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addStep}>
            新增關卡
          </Button>
        </div>

        {steps.map((step, index) => (
          <Card
            key={index}
            size="small"
            style={{ marginBottom: 8 }}
            extra={
              steps.length > 1 ? (
                <Button
                  type="link"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => removeStep(index)}
                />
              ) : null
            }
          >
            <Space wrap style={{ width: '100%' }}>
              <div>
                <label>順序</label>
                <InputNumber
                  min={1}
                  value={step.step_order}
                  onChange={(v) => updateStep(index, 'step_order', v || 1)}
                  style={{ width: 70, display: 'block' }}
                />
              </div>
              <div>
                <label>類型</label>
                <Select
                  value={step.step_type}
                  onChange={(v) => updateStep(index, 'step_type', v)}
                  style={{ width: 120, display: 'block' }}
                  options={[
                    { value: 'sequential', label: '逐級簽核' },
                    { value: 'countersign', label: '會簽' },
                  ]}
                />
              </div>
              <div>
                <label>關卡名稱</label>
                <Input
                  value={step.step_name}
                  onChange={(e) => updateStep(index, 'step_name', e.target.value)}
                  placeholder="關卡名稱"
                  style={{ width: 140, display: 'block' }}
                />
              </div>
              <div>
                <label>簽核人</label>
                <Select
                  value={step.approver_id}
                  onChange={(v) => updateStep(index, 'approver_id', v)}
                  options={userOptions}
                  placeholder="選擇簽核人"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  style={{ width: 200, display: 'block' }}
                />
              </div>
            </Space>
          </Card>
        ))}
      </Modal>
    </div>
  );
};

export default WorkflowSettings;
