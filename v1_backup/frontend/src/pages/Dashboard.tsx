import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic, List, Spin, Button } from 'antd';
import {
  AuditOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../api/client';
import { useAuthStore } from '../store/authStore';

interface DashboardStats {
  pending_approval: number;
  my_in_progress: number;
  completed_this_month: number;
  rejected: number;
}

interface RecentActivityItem {
  action: string;
  contract_no: string;
  contract_title: string;
  approver_name: string;
  acted_at: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const {
    data: statsData,
    isLoading: statsLoading,
  } = useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const res = await dashboardAPI.stats();
      return res.data;
    },
  });

  const {
    data: activityData,
    isLoading: activityLoading,
  } = useQuery<RecentActivityItem[]>({
    queryKey: ['dashboard', 'recentActivity'],
    queryFn: async () => {
      const res = await dashboardAPI.recentActivity();
      return res.data;
    },
  });

  const statCards: {
    title: string;
    value: number;
    color: string;
    icon: React.ReactNode;
  }[] = [
    {
      title: '待我簽核',
      value: statsData?.pending_approval ?? 0,
      color: '#1890ff',
      icon: <AuditOutlined />,
    },
    {
      title: '我的簽核中',
      value: statsData?.my_in_progress ?? 0,
      color: '#fa8c16',
      icon: <SyncOutlined />,
    },
    {
      title: '本月已完成',
      value: statsData?.completed_this_month ?? 0,
      color: '#52c41a',
      icon: <CheckCircleOutlined />,
    },
    {
      title: '已退回',
      value: statsData?.rejected ?? 0,
      color: '#f5222d',
      icon: <CloseCircleOutlined />,
    },
  ];

  const actionLabel = (action: string): string => {
    const map: Record<string, string> = {
      approve: '核准',
      reject: '退回',
      submit: '送簽',
      void: '作廢',
    };
    return map[action] || action;
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>個人儀表板</h2>

      {/* Stat Cards */}
      <Spin spinning={statsLoading}>
        <Row gutter={[16, 16]}>
          {statCards.map((card) => (
            <Col xs={24} sm={12} md={6} key={card.title}>
              <Card hoverable>
                <Statistic
                  title={card.title}
                  value={card.value}
                  prefix={
                    <span style={{ color: card.color }}>{card.icon}</span>
                  }
                  valueStyle={{ color: card.color }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>

      {/* Quick Actions */}
      <Card title="快速操作" style={{ marginTop: 24 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/contracts/new')}
          style={{ marginRight: 12 }}
        >
          新增合約
        </Button>
        <Button
          icon={<UnorderedListOutlined />}
          onClick={() => navigate('/approvals/pending')}
          style={{ marginRight: 12 }}
        >
          待簽核列表
        </Button>
        {isAdmin && (
          <Button
            icon={<BarChartOutlined />}
            onClick={() => navigate('/admin/reports')}
          >
            管理報表
          </Button>
        )}
      </Card>

      {/* Recent Activity */}
      <Card title="近期動態" style={{ marginTop: 24 }}>
        <Spin spinning={activityLoading}>
          <List<RecentActivityItem>
            dataSource={activityData ?? []}
            locale={{ emptyText: '尚無近期動態' }}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <span>
                      <strong>{item.approver_name}</strong>{' '}
                      {actionLabel(item.action)}了合約{' '}
                      <em>
                        {item.contract_no} - {item.contract_title}
                      </em>
                    </span>
                  }
                  description={item.acted_at}
                />
              </List.Item>
            )}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default Dashboard;
