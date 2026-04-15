import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Card,
  message,
  Upload,
  Space,
} from 'antd';
import { UploadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { contractAPI } from '../api/client';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import dayjs from 'dayjs';

const contractTypeOptions = [
  { value: 'purchase', label: '採購合約' },
  { value: 'nda', label: '保密協議' },
  { value: 'service', label: '勞務合約' },
  { value: 'sales', label: '銷售合約' },
  { value: 'other', label: '其他' },
];

export default function ContractForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const contractId = id ? Number(id) : null;

  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const { data: contractData, isLoading } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: async () => {
      if (!contractId) return null;
      const res = await contractAPI.get(contractId);
      return res.data;
    },
    enabled: isEdit && contractId !== null,
  });

  useEffect(() => {
    if (contractData) {
      form.setFieldsValue({
        title: contractData.title,
        counterparty: contractData.counterparty,
        amount: contractData.amount,
        contract_type: contractData.contract_type,
        start_date: contractData.start_date ? dayjs(contractData.start_date) : null,
        end_date: contractData.end_date ? dayjs(contractData.end_date) : null,
      });

      if (contractData.attachments && contractData.attachments.length > 0) {
        setFileList(
          contractData.attachments.map((att: { id: number; filename: string; file_size: number }) => ({
            uid: String(att.id),
            name: att.filename,
            size: att.file_size,
            status: 'done' as const,
          }))
        );
      }
    }
  }, [contractData, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: values.title,
        counterparty: values.counterparty || null,
        amount: values.amount ?? null,
        contract_type: values.contract_type || null,
        start_date: values.start_date
          ? (values.start_date as dayjs.Dayjs).format('YYYY-MM-DD')
          : null,
        end_date: values.end_date
          ? (values.end_date as dayjs.Dayjs).format('YYYY-MM-DD')
          : null,
      };

      if (isEdit && contractId) {
        await contractAPI.update(contractId, payload);
        message.success('合約已更新');
      } else {
        await contractAPI.create(payload);
        message.success('合約已建立');
      }

      navigate('/contracts');
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        '操作失敗，請稍後再試';
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const uploadProps: UploadProps = {
    fileList,
    beforeUpload: () => false,
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList);
    },
    customRequest: async ({ file, onSuccess, onError }) => {
      if (!contractId) {
        message.warning('請先儲存合約再上傳檔案');
        return;
      }
      try {
        await contractAPI.uploadFile(contractId, file as File);
        message.success('檔案上傳成功');
        onSuccess?.(null);
      } catch (err) {
        message.error('檔案上傳失敗');
        onError?.(err as Error);
      }
    },
  };

  return (
    <Card
      title={isEdit ? '編輯合約' : '建立合約'}
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/contracts')}>
          返回列表
        </Button>
      }
      loading={isEdit && isLoading}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ maxWidth: 720 }}
      >
        <Form.Item
          name="title"
          label="合約名稱"
          rules={[{ required: true, message: '請輸入合約名稱' }]}
        >
          <Input placeholder="請輸入合約名稱" />
        </Form.Item>

        <Form.Item name="counterparty" label="對方單位">
          <Input placeholder="請輸入對方單位名稱" />
        </Form.Item>

        <Form.Item name="amount" label="金額">
          <InputNumber
            placeholder="請輸入金額"
            style={{ width: '100%' }}
            min={0}
            formatter={(value) =>
              value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''
            }
            parser={(value) => Number(value?.replace(/,/g, '') || 0) as 0}
          />
        </Form.Item>

        <Form.Item name="contract_type" label="合約類型">
          <Select
            placeholder="請選擇合約類型"
            allowClear
            options={contractTypeOptions}
          />
        </Form.Item>

        <Space size="large">
          <Form.Item name="start_date" label="開始日期">
            <DatePicker placeholder="選擇日期" />
          </Form.Item>

          <Form.Item name="end_date" label="結束日期">
            <DatePicker placeholder="選擇日期" />
          </Form.Item>
        </Space>

        <Form.Item label="附件上傳">
          {isEdit ? (
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>上傳檔案</Button>
            </Upload>
          ) : (
            <Upload
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList: newFileList }) => setFileList(newFileList)}
            >
              <Button icon={<UploadOutlined />}>
                上傳檔案（儲存合約後將自動上傳）
              </Button>
            </Upload>
          )}
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {isEdit ? '更新合約' : '建立合約'}
            </Button>
            <Button onClick={() => navigate('/contracts')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
