import { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Space, Tag, message, List } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowAPI, userAPI } from '../api/client';

export default function WorkflowSettings() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [steps, setSteps] = useState<any[]>([]);

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowAPI.list().then(r => r.data),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => userAPI.list().then(r => r.data),
  });

  const saveMut = useMutation({
    mutationFn: (values: any) => {
      const payload = { ...values, steps: steps.map((s, i) => ({ ...s, step_order: i + 1 })) };
      return editId ? workflowAPI.update(editId, payload) : workflowAPI.create(payload);
    },
    onSuccess: () => { message.success('已儲存'); setModalOpen(false); queryClient.invalidateQueries({ queryKey: ['workflows'] }); },
    onError: (e: any) => message.error(e.response?.data?.detail || '儲存失敗'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => workflowAPI.delete(id),
    onSuccess: () => { message.success('已停用'); queryClient.invalidateQueries({ queryKey: ['workflows'] }); },
  });

  const openNew = () => { setEditId(null); form.resetFields(); setSteps([{ step_type: 'sequential', approver_id: null }]); setModalOpen(true); };
  const openEdit = (w: any) => {
    setEditId(w.id);
    form.setFieldsValue({ name: w.name, contract_type: w.contract_type, amount_min: w.amount_min, amount_max: w.amount_max });
    setSteps(w.steps.map((s: any) => ({ step_type: s.step_type, approver_id: s.approver_id, approver_role: s.approver_role })));
    setModalOpen(true);
  };

  const columns = [
    { title: '名稱', dataIndex: 'name' },
    { title: '適用類型', dataIndex: 'contract_type', render: (v: string) => v || '通用' },
    { title: '金額範圍', render: (_: any, r: any) => r.amount_min || r.amount_max ? `${r.amount_min || 0} ~ ${r.amount_max || '∞'}` : '不限' },
    { title: '步驟數', render: (_: any, r: any) => <Tag>{r.steps?.length || 0} 步</Tag> },
    {
      title: '操作', width: 160, render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => openEdit(r)}>編輯</Button>
          <Button size="small" danger onClick={() => deleteMut.mutate(r.id)}>停用</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card title="簽核流程範本" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openNew}>新增流程</Button>}>
        <Table rowKey="id" columns={columns} dataSource={workflows || []} loading={isLoading} pagination={false} />
      </Card>

      <Modal
        title={editId ? '編輯流程' : '新增流程'}
        open={modalOpen} width={640}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.validateFields().then(v => saveMut.mutate(v))}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="流程名稱" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item name="contract_type" label="適用合約類型">
              <Select allowClear style={{ width: 160 }} options={[
                { value: 'purchase', label: '採購' }, { value: 'nda', label: 'NDA' },
                { value: 'service', label: '勞務' }, { value: 'other', label: '其他' },
              ]} />
            </Form.Item>
            <Form.Item name="amount_min" label="金額下限"><InputNumber style={{ width: 120 }} /></Form.Item>
            <Form.Item name="amount_max" label="金額上限"><InputNumber style={{ width: 120 }} /></Form.Item>
          </Space>
        </Form>

        <div style={{ marginTop: 16 }}>
          <strong>簽核步驟</strong>
          <List
            size="small"
            dataSource={steps}
            renderItem={(step, idx) => (
              <List.Item actions={[
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => setSteps(s => s.filter((_, i) => i !== idx))} />,
              ]}>
                <Space>
                  <Tag>第 {idx + 1} 關</Tag>
                  <Select value={step.step_type} onChange={(v) => setSteps(s => s.map((item, i) => i === idx ? { ...item, step_type: v } : item))}
                    options={[{ value: 'sequential', label: '循序' }, { value: 'countersign', label: '會簽' }]}
                    style={{ width: 100 }}
                  />
                  <Select value={step.approver_id} onChange={(v) => setSteps(s => s.map((item, i) => i === idx ? { ...item, approver_id: v } : item))}
                    placeholder="選擇簽核人" style={{ width: 180 }}
                    options={(users || []).map((u: any) => ({ value: u.id, label: `${u.name} (${u.department || ''})` }))}
                  />
                </Space>
              </List.Item>
            )}
          />
          <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setSteps(s => [...s, { step_type: 'sequential', approver_id: null }])}>
            新增步驟
          </Button>
        </div>
      </Modal>
    </>
  );
}
