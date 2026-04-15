import React, { useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Radio,
  Checkbox,
  Button,
  Typography,
  Row,
  Col,
  Spin,
  message,
  Divider,
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { contractAPI, vendorAPI } from '../api/client';
import { CONTRACT_TYPES } from '../types/index';
import type { Contract, Vendor } from '../types/index';

const { Title } = Typography;
const { TextArea } = Input;

const ContractForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== 'new';
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // Fetch contract for edit
  const { data: contract, isLoading: contractLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractAPI.get(Number(id)).then((r) => r.data),
    enabled: isEdit,
  });

  // Fetch vendors
  const { data: vendorsData } = useQuery({
    queryKey: ['vendors-select'],
    queryFn: () => vendorAPI.list({ page_size: 500 }).then((r) => r.data),
  });

  const vendors: Vendor[] = vendorsData?.items ?? vendorsData?.data ?? vendorsData ?? [];

  // Populate form when editing
  useEffect(() => {
    if (contract && isEdit) {
      const c = contract as Contract;
      form.setFieldsValue({
        ...c,
        start_date: c.start_date ? dayjs(c.start_date) : null,
        end_date: c.end_date ? dayjs(c.end_date) : null,
      });
    }
  }, [contract, isEdit, form]);

  const extractErrorMessage = (err: unknown, fallback: string) => {
    const e = err as { response?: { data?: { detail?: unknown } } };
    const detail = e?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => (d as { msg?: string }).msg || JSON.stringify(d)).join('; ');
    }
    return fallback;
  };

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => contractAPI.create(values),
    onSuccess: (res) => {
      message.success('合約已建立');
      navigate(`/contracts/${res.data.id}`);
    },
    onError: (err) => message.error(extractErrorMessage(err, '建立失敗')),
  });

  const updateMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => contractAPI.update(Number(id), values),
    onSuccess: () => {
      message.success('合約已更新');
      navigate(`/contracts/${id}`);
    },
    onError: (err) => message.error(extractErrorMessage(err, '更新失敗')),
  });

  const onFinish = (values: Record<string, unknown>) => {
    const payload = {
      ...values,
      start_date: values.start_date
        ? (values.start_date as dayjs.Dayjs).format('YYYY-MM-DD')
        : null,
      end_date: values.end_date
        ? (values.end_date as dayjs.Dayjs).format('YYYY-MM-DD')
        : null,
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  const typeOptions = Object.entries(CONTRACT_TYPES).map(([key, label]) => ({
    label,
    value: key,
  }));

  const vendorOptions = vendors.map((v) => ({ label: v.name, value: v.id }));

  return (
    <div>
      <Title level={4}>{isEdit ? '編輯合約' : '新增合約'}</Title>

      <Spin spinning={isEdit && contractLoading}>
        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              contract_format: 'standard',
              currency: 'TWD',
              stamp_copies: 2,
              roi_required: false,
              ip_notification_required: false,
            }}
          >
            <Row gutter={24}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="title"
                  label="合約名稱"
                  rules={[{ required: true, message: '請輸入合約名稱' }]}
                >
                  <Input placeholder="請輸入合約名稱" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="contract_type" label="合約類型">
                  <Select placeholder="選擇合約類型" options={typeOptions} allowClear />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col xs={24} sm={12}>
                <Form.Item name="contract_format" label="合約格式">
                  <Radio.Group>
                    <Radio value="standard">制式合約</Radio>
                    <Radio value="non_standard">非制式合約</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="vendor_id" label="廠商">
                  <Select
                    placeholder="選擇廠商"
                    options={vendorOptions}
                    allowClear
                    showSearch
                    optionFilterProp="label"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col xs={24} sm={8}>
                <Form.Item name="amount" label="金額">
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(v) => v?.replace(/,/g, '') as unknown as number}
                    placeholder="請輸入金額"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={4}>
                <Form.Item name="currency" label="幣別">
                  <Select>
                    <Select.Option value="TWD">TWD</Select.Option>
                    <Select.Option value="USD">USD</Select.Option>
                    <Select.Option value="EUR">EUR</Select.Option>
                    <Select.Option value="JPY">JPY</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={6}>
                <Form.Item name="start_date" label="合約起始日">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={6}>
                <Form.Item name="end_date" label="合約結束日">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label="合約說明">
              <TextArea rows={4} placeholder="請輸入合約說明" />
            </Form.Item>

            <Divider />

            <Row gutter={24}>
              <Col xs={24} sm={8}>
                <Form.Item name="requester_dept" label="需求部門">
                  <Input placeholder="需求部門" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="project_name" label="專案名稱">
                  <Input placeholder="專案名稱" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="stamp_copies" label="用印份數">
                  <InputNumber min={1} max={10} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col xs={12} sm={6}>
                <Form.Item name="roi_required" valuePropName="checked">
                  <Checkbox>需 ROI 分析</Checkbox>
                </Form.Item>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Item name="ip_notification_required" valuePropName="checked">
                  <Checkbox>需智財通知</Checkbox>
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Row justify="end" gutter={12}>
              <Col>
                <Button onClick={() => navigate(-1)}>取消</Button>
              </Col>
              <Col>
                <Button type="primary" htmlType="submit" loading={saving}>
                  {isEdit ? '更新' : '建立'}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card>
      </Spin>
    </div>
  );
};

export default ContractForm;
