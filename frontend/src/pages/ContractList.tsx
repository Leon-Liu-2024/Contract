import React, { useState } from 'react';
import {
  Table,
  Card,
  Input,
  Select,
  Button,
  Tag,
  Space,
  Row,
  Col,
  Typography,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { contractAPI } from '../api/client';
import { CONTRACT_TYPES, CONTRACT_STAGES } from '../types/index';
import type { Contract } from '../types/index';

const { Title } = Typography;

const ContractList: React.FC = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [contractType, setContractType] = useState<string | undefined>();
  const [currentStage, setCurrentStage] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', keyword, contractType, currentStage, page, pageSize],
    queryFn: () =>
      contractAPI
        .list({
          keyword: keyword || undefined,
          contract_type: contractType,
          current_stage: currentStage,
          page,
          page_size: pageSize,
        })
        .then((r) => r.data),
  });

  const contracts: Contract[] = data?.items ?? data?.data ?? data ?? [];
  const total: number = data?.total ?? contracts.length;

  const columns = [
    {
      title: '合約編號',
      dataIndex: 'contract_no',
      key: 'contract_no',
      render: (text: string, record: Contract) => (
        <Link to={`/contracts/${record.id}`}>{text}</Link>
      ),
    },
    {
      title: '合約名稱',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '廠商',
      dataIndex: 'vendor_name',
      key: 'vendor_name',
    },
    {
      title: '金額',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (v: number | null) =>
        v != null ? `NT$ ${v.toLocaleString()}` : '-',
    },
    {
      title: '合約類型',
      dataIndex: 'contract_type',
      key: 'contract_type',
      render: (v: string) => (
        <Tag>{CONTRACT_TYPES[v] ?? v}</Tag>
      ),
    },
    {
      title: '目前階段',
      dataIndex: 'current_stage',
      key: 'current_stage',
      render: (v: string) => {
        const info = CONTRACT_STAGES[v];
        return <Tag color={info?.color}>{info?.label ?? v}</Tag>;
      },
    },
    {
      title: '更新時間',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
  ];

  const stageOptions = Object.entries(CONTRACT_STAGES)
    .filter(([, v]) => v.order > 0)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key, val]) => ({ label: val.label, value: key }));

  const typeOptions = Object.entries(CONTRACT_TYPES).map(([key, label]) => ({
    label,
    value: key,
  }));

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            合約列表
          </Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/contracts/new')}
          >
            新增合約
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={8}>
            <Input
              placeholder="搜尋合約編號或名稱"
              prefix={<SearchOutlined />}
              allowClear
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
            />
          </Col>
          <Col xs={12} sm={5}>
            <Select
              placeholder="合約類型"
              allowClear
              style={{ width: '100%' }}
              options={typeOptions}
              value={contractType}
              onChange={(v) => {
                setContractType(v);
                setPage(1);
              }}
            />
          </Col>
          <Col xs={12} sm={5}>
            <Select
              placeholder="目前階段"
              allowClear
              style={{ width: '100%' }}
              options={stageOptions}
              value={currentStage}
              onChange={(v) => {
                setCurrentStage(v);
                setPage(1);
              }}
            />
          </Col>
          <Col>
            <Space>
              <Button
                onClick={() => {
                  setKeyword('');
                  setContractType(undefined);
                  setCurrentStage(undefined);
                  setPage(1);
                }}
              >
                清除篩選
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={contracts}
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 筆`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
};

export default ContractList;
