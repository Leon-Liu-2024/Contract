import { useState } from 'react';
import { Card, Row, Col, Statistic, Table, Button, DatePicker, Space, Tag, message } from 'antd';
import { DownloadOutlined, FileExcelOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, string> = {
  draft: '#d9d9d9', pending: '#1890ff', approved: '#52c41a', rejected: '#ff4d4f', void: '#faad14',
};
const STATUS_LABELS: Record<string, string> = {
  draft: '草稿', pending: '簽核中', approved: '已核准', rejected: '已退回', void: '已作廢',
};

export default function AdminReports() {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([
    dayjs().subtract(30, 'day'), dayjs(),
  ]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => dashboardAPI.adminStats().then(r => r.data),
  });

  const { data: overdue } = useQuery({
    queryKey: ['overdue'],
    queryFn: () => dashboardAPI.overdue().then(r => r.data),
  });

  const handleExport = async () => {
    try {
      const response = await dashboardAPI.export({
        start_date: dateRange[0]?.format('YYYY-MM-DD'),
        end_date: dateRange[1]?.format('YYYY-MM-DD'),
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `合約報表_${dayjs().format('YYYYMMDD')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('報表已下載');
    } catch {
      message.error('匯出失敗');
    }
  };

  const statusData = stats?.by_status
    ? Object.entries(stats.by_status).map(([key, value]) => ({
        name: STATUS_LABELS[key] || key,
        value: value as number,
        color: STATUS_COLORS[key] || '#999',
      }))
    : [];

  const typeData = stats?.by_type
    ? Object.entries(stats.by_type).map(([key, value]) => ({
        name: key === 'purchase' ? '採購' : key === 'nda' ? 'NDA' : key === 'service' ? '勞務' : key === 'sales' ? '銷售' : key || '未分類',
        count: value as number,
      }))
    : [];

  const overdueColumns = [
    { title: '合約編號', dataIndex: 'contract_no' },
    { title: '標題', dataIndex: 'title', ellipsis: true },
    { title: '目前步驟', dataIndex: 'current_step', render: (v: number) => <Tag color="orange">第 {v} 關</Tag> },
    { title: '待簽人', dataIndex: 'approver_name' },
    { title: '滯留天數', dataIndex: 'days_pending', render: (v: number) => <Tag color={v > 7 ? 'red' : 'orange'}>{v} 天</Tag> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="合約總數" value={stats?.total || 0} />
          </Col>
          <Col span={6}>
            <Statistic title="簽核中" value={stats?.by_status?.pending || 0} valueStyle={{ color: '#1890ff' }} />
          </Col>
          <Col span={6}>
            <Statistic title="已核准" value={stats?.by_status?.approved || 0} valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col span={6}>
            <Statistic title="已退回" value={stats?.by_status?.rejected || 0} valueStyle={{ color: '#ff4d4f' }} />
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="合約狀態分布">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {statusData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="合約類型統計">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1890ff" name="數量" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card
        title={<><ClockCircleOutlined /> 逾期未簽合約</>}
        extra={
          <Space>
            <DatePicker.RangePicker
              value={dateRange as any}
              onChange={(v) => setDateRange(v as any)}
            />
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
              <FileExcelOutlined /> 匯出 Excel
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="contract_id"
          columns={overdueColumns}
          dataSource={overdue || []}
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '沒有逾期未簽的合約' }}
        />
      </Card>
    </div>
  );
}
