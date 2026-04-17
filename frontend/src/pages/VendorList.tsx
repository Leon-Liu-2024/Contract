import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorAPI } from '../api/client';
import type { Vendor } from '../types/index';

const VendorList: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => vendorAPI.list().then((res) => res.data as Vendor[]),
  });

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => vendorAPI.create(values),
    onSuccess: () => {
      message.success('新增廠商成功');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      closeModal();
    },
    onError: () => message.error('新增廠商失敗'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: Record<string, unknown> }) =>
      vendorAPI.update(id, values),
    onSuccess: () => {
      message.success('更新廠商成功');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      closeModal();
    },
    onError: () => message.error('更新廠商失敗'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => vendorAPI.delete(id),
    onSuccess: () => {
      message.success('刪除廠商成功');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: () => message.error('刪除廠商失敗'),
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

  const openEdit = (record: Vendor) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingId) {
        updateMutation.mutate({ id: editingId, values });
      } else {
        createMutation.mutate(values);
      }
    });
  };

  const columns = [
    { title: '廠商名稱', dataIndex: 'name', key: 'name', ellipsis: true, width: 180 },
    { title: '統一編號', dataIndex: 'tax_id', key: 'tax_id', width: 110 },
    { title: '聯絡人', dataIndex: 'contact_name', key: 'contact_name', width: 100 },
    { title: '聯絡電話', dataIndex: 'contact_phone', key: 'contact_phone', width: 140,
      render: (v: string | null) => v || <span style={{ color: '#bbb' }}>未填</span> },
    { title: '地址', dataIndex: 'address', key: 'address', ellipsis: true,
      render: (v: string | null) => v || <span style={{ color: '#bbb' }}>未填</span> },
    { title: '聯絡信箱', dataIndex: 'contact_email', key: 'contact_email', width: 180, ellipsis: true },
    { title: '類別', dataIndex: 'category', key: 'category', width: 90 },
    {
      title: '稅籍登記',
      dataIndex: 'tax_registered',
      key: 'tax_registered',
      width: 90,
      render: (val: boolean) => (
        <Tag color={val ? 'green' : 'red'}>{val ? '已登記' : '未登記'}</Tag>
      ),
    },
    {
      title: '商業登記',
      dataIndex: 'business_registered',
      key: 'business_registered',
      width: 90,
      render: (val: boolean) => (
        <Tag color={val ? 'green' : 'red'}>{val ? '已登記' : '未登記'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_: unknown, record: Vendor) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          >
            編輯
          </Button>
          <Popconfirm
            title="確定要刪除此廠商？"
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
        <h2 style={{ margin: 0 }}>廠商管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增廠商
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data || []}
        loading={isLoading}
        pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `共 ${t} 筆` }}
      />

      <Modal
        title={editingId ? '編輯廠商' : '新增廠商'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText="儲存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="廠商名稱"
            rules={[{ required: true, message: '請輸入廠商名稱' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="tax_id" label="統一編號">
            <Input />
          </Form.Item>
          <Form.Item name="business_reg_no" label="商業登記字號">
            <Input />
          </Form.Item>
          <Form.Item name="contact_name" label="聯絡人">
            <Input />
          </Form.Item>
          <Form.Item
            name="contact_phone"
            label="聯絡電話"
            extra="產生合約文件時自動帶入「甲方聯絡人及電話」欄位"
          >
            <Input placeholder="例：02-1234-5678" />
          </Form.Item>
          <Form.Item name="contact_email" label="聯絡信箱">
            <Input />
          </Form.Item>
          <Form.Item
            name="address"
            label="地址"
            extra="產生合約文件時自動帶入「地址」欄位"
          >
            <Input placeholder="例：台北市信義區○○路○○號" />
          </Form.Item>
          <Form.Item name="category" label="類別">
            <Select
              allowClear
              placeholder="選擇類別"
              options={[
                { value: 'IT', label: '資訊科技' },
                { value: 'consulting', label: '顧問' },
                { value: 'construction', label: '營建' },
                { value: 'maintenance', label: '維護' },
                { value: 'supplies', label: '物料' },
                { value: 'other', label: '其他' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default VendorList;
