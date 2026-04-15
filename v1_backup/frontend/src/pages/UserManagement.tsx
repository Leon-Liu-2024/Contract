import { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, Tag, message, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI } from '../api/client';
import dayjs from 'dayjs';

const roleColors: Record<string, string> = { admin: 'red', manager: 'blue', user: 'green' };
const roleLabels: Record<string, string> = { admin: '管理員', manager: '主管', user: '一般使用者' };

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userAPI.list().then(r => r.data),
  });

  const saveMut = useMutation({
    mutationFn: (values: any) => {
      const payload = {
        ...values,
        deputy_start: values.deputy_range?.[0]?.format('YYYY-MM-DD') || null,
        deputy_end: values.deputy_range?.[1]?.format('YYYY-MM-DD') || null,
      };
      delete payload.deputy_range;
      return editId ? userAPI.update(editId, payload) : userAPI.create(payload);
    },
    onSuccess: () => { message.success('已儲存'); setModalOpen(false); queryClient.invalidateQueries({ queryKey: ['users'] }); },
    onError: (e: any) => message.error(e.response?.data?.detail || '儲存失敗'),
  });

  const openNew = () => {
    setEditId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (u: any) => {
    setEditId(u.id);
    form.setFieldsValue({
      name: u.name,
      email: u.email,
      department: u.department,
      role: u.role,
      deputy_id: u.deputy_id,
      deputy_range: u.deputy_start && u.deputy_end ? [dayjs(u.deputy_start), dayjs(u.deputy_end)] : undefined,
    });
    setModalOpen(true);
  };

  const columns = [
    { title: '姓名', dataIndex: 'name', width: 120 },
    { title: 'Email', dataIndex: 'email' },
    { title: '部門', dataIndex: 'department', width: 120 },
    {
      title: '角色', dataIndex: 'role', width: 100,
      render: (v: string) => <Tag color={roleColors[v]}>{roleLabels[v] || v}</Tag>,
    },
    {
      title: '代理人', width: 160,
      render: (_: any, r: any) => {
        if (!r.deputy_id) return '-';
        const deputy = (users || []).find((u: any) => u.id === r.deputy_id);
        return (
          <span>
            {deputy?.name || `ID:${r.deputy_id}`}
            {r.deputy_start && <div style={{ fontSize: 12, color: '#999' }}>{r.deputy_start} ~ {r.deputy_end}</div>}
          </span>
        );
      },
    },
    {
      title: '狀態', dataIndex: 'is_active', width: 80,
      render: (v: boolean) => <Tag color={v !== false ? 'green' : 'default'}>{v !== false ? '啟用' : '停用'}</Tag>,
    },
    {
      title: '操作', width: 80,
      render: (_: any, r: any) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>編輯</Button>
      ),
    },
  ];

  return (
    <>
      <Card title="使用者管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openNew}>新增使用者</Button>}>
        <Table rowKey="id" columns={columns} dataSource={users || []} loading={isLoading} pagination={false} />
      </Card>

      <Modal
        title={editId ? '編輯使用者' : '新增使用者'}
        open={modalOpen} width={520}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.validateFields().then(v => saveMut.mutate(v))}
        confirmLoading={saveMut.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          {!editId && (
            <Form.Item name="password" label="密碼" rules={[{ required: true, min: 6 }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Space style={{ width: '100%' }}>
            <Form.Item name="department" label="部門">
              <Input style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="role" label="角色" rules={[{ required: true }]}>
              <Select style={{ width: 140 }} options={[
                { value: 'admin', label: '管理員' },
                { value: 'manager', label: '主管' },
                { value: 'user', label: '一般使用者' },
              ]} />
            </Form.Item>
          </Space>
          <Form.Item name="deputy_id" label="代理人">
            <Select allowClear placeholder="選擇代理人" style={{ width: '100%' }}
              options={(users || []).filter((u: any) => u.id !== editId).map((u: any) => ({
                value: u.id, label: `${u.name} (${u.department || ''})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="deputy_range" label="代理期間">
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
