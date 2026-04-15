import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Space } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const loginRes = await authAPI.login(values.email, values.password);
      const token: string = loginRes.data.access_token ?? loginRes.data.token;
      localStorage.setItem('token', token);

      const meRes = await authAPI.me();
      setAuth(token, meRes.data);
      message.success('登入成功');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ??
        '登入失敗，請確認帳號密碼';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card style={{ width: 420, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%', textAlign: 'center' }}>
          <Title level={3} style={{ marginBottom: 0 }}>
            合約簽核管理系統 V2
          </Title>
          <Text type="secondary">Contract Approval Management System</Text>
        </Space>

        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ email: 'admin@company.com', password: 'pass1234' }}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="email"
            label="電子郵件"
            rules={[{ required: true, message: '請輸入電子郵件' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="admin@company.com" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密碼"
            rules={[{ required: true, message: '請輸入密碼' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="pass1234" size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              登入
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
