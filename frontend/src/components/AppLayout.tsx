import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown } from 'antd';
import {
  DashboardOutlined, FileTextOutlined, AuditOutlined,
  HourglassOutlined, SettingOutlined, TeamOutlined,
  BarChartOutlined, LogoutOutlined, UserOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import NotificationBell from './NotificationBell';

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isAdminOrPmo = isAdmin || user?.role === 'pmo';

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '儀表板' },
    { key: '/contracts', icon: <FileTextOutlined />, label: '合約管理' },
    { key: '/approvals/pending', icon: <HourglassOutlined />, label: '待我簽核' },
    { key: '/vendors', icon: <ShopOutlined />, label: '廠商管理' },
    ...(isAdminOrPmo ? [
      {
        key: 'admin', icon: <SettingOutlined />, label: '系統管理',
        children: [
          { key: '/settings/workflows', icon: <AuditOutlined />, label: '流程範本' },
          { key: '/admin/users', icon: <TeamOutlined />, label: '使用者管理' },
          { key: '/admin/reports', icon: <BarChartOutlined />, label: '管理報表' },
        ],
      },
    ] : []),
  ];

  const userMenu = {
    items: [
      { key: 'name', label: `${user?.name} (${user?.department || ''})`, disabled: true },
      { key: 'role', label: `角色：${user?.role} / ${user?.title || ''}`, disabled: true },
      { type: 'divider' as const },
      { key: 'logout', label: '登出', icon: <LogoutOutlined />, danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') { logout(); navigate('/login'); }
    },
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark">
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <strong style={{ fontSize: collapsed ? 14 : 16 }}>
            {collapsed ? 'CAS' : '合約簽核管理系統'}
          </strong>
        </div>
        <Menu
          theme="dark" mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['admin']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <NotificationBell />
          <Dropdown menu={userMenu} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
              {!collapsed && <span>{user?.name}</span>}
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#f5f5f5', borderRadius: 8, minHeight: 360 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
