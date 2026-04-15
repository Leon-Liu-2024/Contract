import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, message, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { userAPI } from '../api/client';
import type { UserProfile } from '../types/index';

const { RangePicker } = DatePicker;

interface UserRecord extends UserProfile {
  deputy_id: number | null;
  deputy_name?: string;
  deputy_start: string | null;
  deputy_end: string | null;
}

const roleColors: Record<string, string> = {
  admin: 'red',
  manager: 'blue',
  legal: 'purple',
  pmo: 'orange',
  user: 'default',
};

const roleLabels: Record<string, string> = {
  admin: '管理員',
  manager: '主管',
  legal: '法務',
  pmo: 'PMO',
  user: '一般使用者',
};

const UserManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userAPI.list().then((res) => res.data as UserRecord[]),
  });

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => userAPI.create(values),
    onSuccess: () => {
      message.success('新增使用者成功');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
    },
    onError: () => message.error('新增使用者失敗'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: Record<string, unknown> }) =>
      userAPI.update(id, values),
    onSuccess: () => {
      message.success('更新使用者成功');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
    },
    onError: () => message.error('更新使用者失敗'),
  });

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    form.resetFields();
  };

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEdit = (record: UserRecord) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      email: record.email,
      department: record.department,
      role: record.role,
      title: record.title,
      deputy_id: record.deputy_id,
      deputy_range:
        record.deputy_start && record.deputy_end
          ? [dayjs(record.deputy_start), dayjs(record.deputy_end)]
          : undefined,
    });
    setModalVisible(true);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const { deputy_range, ...rest } = values;
      const payload: Record<string, unknown> = { ...rest };
      if (deputy_range && deputy_range.length === 2) {
        payload.deputy_start = deputy_range[0].format('YYYY-MM-DD');
        payload.deputy_end = deputy_range[1].format('YYYY-MM-DD');
      }
      if (editingId) {
        delete payload.password;
        updateMutation.mutate({ id: editingId, values: payload });
      } else {
        createMutation.mutate(payload);
      }
    });
  };

  const userOptions = (users || []).map((u) => ({
    value: u.id,
    label: `${u.name} (${u.department || ''})`,
  }));

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name', width: 100 },
    { title: '信箱', dataIndex: 'email', key: 'email', width: 200, ellipsis: true },
    { title: '部門', dataIndex: 'department', key: 'department', width: 120 },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (val: string) => (
        <Tag color={roleColors[val] || 'default'}>{roleLabels[val] || val}</Tag>
      ),
    },
    { title: '職稱', dataIndex: 'title', key: 'title', width: 120 },
    {
      title: '代理人',
      dataIndex: 'deputy_name',
      key: 'deputy_name',
      width: 100,
      render: (val: string | undefined) => val || '-',
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (val: boolean) => <Tag color={val ? 'green' : 'red'}>{val ? '啟用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: UserRecord) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
          編輯
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>使用者管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增使用者
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={users || []}
        loading={isLoading}
        pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `共 ${t} 筆` }}
      />

      <Modal
        title={editingId ? '編輯使用者' : '新增使用者'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText="儲存"
        cancelText="取消"
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '請輸入姓名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="信箱"
            rules={[
              { required: true, message: '請輸入信箱' },
              { type: 'email', message: '請輸入有效信箱' },
            ]}
          >
            <Input />
          </Form.Item>
          {!editingId && (
            <Form.Item
              name="password"
              label="密碼"
              rules={[{ required: true, message: '請輸入密碼' }]}
            >
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="department" label="部門">
            <Input />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '請選擇角色' }]}
          >
            <Select
              options={[
                { value: 'admin', label: '管理員' },
                { value: 'manager', label: '主管' },
                { value: 'legal', label: '法務' },
                { value: 'pmo', label: 'PMO' },
                { value: 'user', label: '一般使用者' },
              ]}
              placeholder="選擇角色"
            />
          </Form.Item>
          <Form.Item name="title" label="職稱">
            <Input />
          </Form.Item>
          <Form.Item name="deputy_id" label="代理人">
            <Select
              options={userOptions}
              placeholder="選擇代理人"
              allowClear
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="deputy_range" label="代理期間">
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
