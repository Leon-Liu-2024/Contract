import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message } from 'antd';
import { authAPI } from '../api/client';
import { useAuthStore } from '../store/authStore';

interface LoginFormValues {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const loginRes = await authAPI.login(values.email, values.password);
      const token: string = loginRes.data.access_token;
      localStorage.setItem('token', token);

      const meRes = await authAPI.me();
      const user = meRes.data;

      setAuth(token, user);
      message.success('登入成功');
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      message.error(error.response?.data?.detail || '登入失敗，請確認帳號密碼');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f0f2f5',
      }}
    >
      <Card
        style={{ width: 420, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
        bordered={false}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ marginBottom: 4, fontSize: 24 }}>合約簽核管理系統</h1>
          <p style={{ color: '#888', margin: 0 }}>Contract Approval System</p>
        </div>

        <Form<LoginFormValues>
          name="login"
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            label="電子信箱"
            name="email"
            rules={[
              { required: true, message: '請輸入電子信箱' },
              { type: 'email', message: '請輸入有效的電子信箱格式' },
            ]}
          >
            <Input
              size="large"
              placeholder="admin@company.com"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            label="密碼"
            name="password"
            rules={[{ required: true, message: '請輸入密碼' }]}
          >
            <Input.Password
              size="large"
              placeholder="pass1234"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
            >
              登入
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
