import React from 'react';
import {
  Card,
  Col,
  Row,
  Statistic,
  Spin,
  Typography,
  List,
  Button,
  Tag,
  Space,
} from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  AuditOutlined,
  TeamOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../api/client';
import { CONTRACT_STAGES } from '../types/index';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardAPI.stats().then((r) => r.data),
  });

  const { data: stageSummary, isLoading: stageLoading } = useQuery({
    queryKey: ['dashboard-stage-summary'],
    queryFn: () => dashboardAPI.stageSummary().then((r) => r.data),
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-recent-activity'],
    queryFn: () => dashboardAPI.recentActivity().then((r) => r.data),
  });

  const statCards = [
    {
      title: '待簽核',
      value: stats?.pending_approval ?? 0,
      icon: <ClockCircleOutlined />,
      color: '#faad14',
    },
    {
      title: '進行中合約',
      value: stats?.my_in_progress ?? 0,
      icon: <FileTextOutlined />,
      color: '#1890ff',
    },
    {
      title: '本月完成',
      value: stats?.completed_this_month ?? 0,
      icon: <CheckCircleOutlined />,
      color: '#52c41a',
    },
    {
      title: '合約總數',
      value: stats?.total_contracts ?? 0,
      icon: <DatabaseOutlined />,
      color: '#722ed1',
    },
  ];

  // Sort stages by order, exclude void
  const orderedStages = stageSummary
    ? [...stageSummary].sort((a: { stage: string }, b: { stage: string }) => {
        const oa = CONTRACT_STAGES[a.stage]?.order ?? 99;
        const ob = CONTRACT_STAGES[b.stage]?.order ?? 99;
        return oa - ob;
      })
    : [];

  return (
    <div>
      <Title level={4}>Dashboard</Title>

      {/* Stat cards */}
      <Spin spinning={statsLoading}>
        <Row gutter={[16, 16]}>
          {statCards.map((s) => (
            <Col xs={12} sm={6} key={s.title}>
              <Card>
                <Statistic
                  title={s.title}
                  value={s.value}
                  prefix={React.cloneElement(s.icon, { style: { color: s.color } })}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>

      {/* Pipeline / Kanban view */}
      <Card title="合約流程 Pipeline" style={{ marginTop: 24 }}>
        <Spin spinning={stageLoading}>
          <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
            <Row gutter={8} wrap={false} style={{ minWidth: orderedStages.length * 130 }}>
              {orderedStages.map(
                (item: { stage: string; label: string; count: number }) => {
                  const stageInfo = CONTRACT_STAGES[item.stage];
                  const color = stageInfo?.color ?? '#d9d9d9';
                  return (
                    <Col key={item.stage} style={{ minWidth: 120 }}>
                      <Card
                        size="small"
                        style={{
                          borderTop: `4px solid ${color}`,
                          textAlign: 'center',
                        }}
                      >
                        <Text strong style={{ fontSize: 12 }}>
                          {item.label}
                        </Text>
                        <div style={{ fontSize: 28, fontWeight: 700, color, margin: '8px 0' }}>
                          {item.count}
                        </div>
                      </Card>
                    </Col>
                  );
                },
              )}
            </Row>
          </div>
        </Spin>
      </Card>

      <Row gutter={16} style={{ marginTop: 24 }}>
        {/* Recent activity */}
        <Col xs={24} md={16}>
          <Card title="最近動態">
            <Spin spinning={activityLoading}>
              <List
                dataSource={recentActivity ?? []}
                renderItem={(item: {
                  contract_no?: string;
                  title?: string;
                  from_stage?: string;
                  to_stage?: string;
                  operator_name?: string;
                  created_at?: string;
                }) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <span>
                          {item.contract_no} - {item.title}
                        </span>
                      }
                      description={
                        <Space>
                          {item.from_stage && (
                            <Tag color={CONTRACT_STAGES[item.from_stage]?.color}>
                              {CONTRACT_STAGES[item.from_stage]?.label ?? item.from_stage}
                            </Tag>
                          )}
                          {item.from_stage && <span>→</span>}
                          <Tag color={CONTRACT_STAGES[item.to_stage ?? '']?.color}>
                            {CONTRACT_STAGES[item.to_stage ?? '']?.label ?? item.to_stage}
                          </Tag>
                          <Text type="secondary">
                            {item.operator_name} | {item.created_at}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
                locale={{ emptyText: '暫無動態' }}
              />
            </Spin>
          </Card>
        </Col>

        {/* Quick actions */}
        <Col xs={24} md={8}>
          <Card title="快速操作">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                block
                onClick={() => navigate('/contracts/new')}
              >
                新增合約
              </Button>
              <Button
                icon={<AuditOutlined />}
                block
                onClick={() => navigate('/approvals/pending')}
              >
                待簽核
              </Button>
              <Button
                icon={<TeamOutlined />}
                block
                onClick={() => navigate('/vendors')}
              >
                廠商管理
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
