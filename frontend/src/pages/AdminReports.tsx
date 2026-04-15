import React from 'react';
import { Card, Col, Row, Statistic, Button, message, Spin } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardAPI } from '../api/client';
import { CONTRACT_STAGES } from '../types/index';
import type { StageSummary } from '../types/index';

const TYPE_COLORS = ['#1890ff', '#52c41a', '#fadb14', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2', '#ff4d4f'];

const AdminReports: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardAPI.stats().then((res) => res.data),
  });

  const { data: stageSummary, isLoading: stageLoading } = useQuery({
    queryKey: ['dashboard-stage-summary'],
    queryFn: () => dashboardAPI.stageSummary().then((res) => res.data as StageSummary[]),
  });

  const handleExport = async () => {
    try {
      const res = await dashboardAPI.exportExcel();
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contract_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('匯出成功');
    } catch {
      message.error('匯出失敗');
    }
  };

  const barData = (stageSummary || []).map((item) => {
    const stage = CONTRACT_STAGES[item.stage];
    return {
      name: stage?.label || item.label || item.stage,
      count: item.count,
      fill: stage?.color || '#1890ff',
    };
  });

  const pieData: { name: string; value: number }[] = stats?.by_type || [];

  const totalContracts: number = stats?.total_contracts ?? 0;

  const loading = statsLoading || stageLoading;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>管理報表</h2>
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
          匯出 Excel
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic title="合約總數" value={totalContracts} />
              </Card>
            </Col>
            <Col span={18}>
              <Card title="各階段合約數">
                <div style={{ height: 80 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{ left: 80 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {barData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Card title="合約類型分布">
                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="各階段合約統計">
                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 20, bottom: 40, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {barData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default AdminReports;
