import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Table, Card, Input, Select, Button, Space, Tag, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { contractAPI } from '../api/client';
import ContractStatusBadge from '../components/ContractStatusBadge';
import type { Contract } from '../types';
import type { ColumnsType } from 'antd/es/table';

const contractTypeLabels: Record<string, string> = {
  purchase: '採購合約',
  nda: '保密協議',
  service: '勞務合約',
  sales: '銷售合約',
  other: '其他',
};

const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '簽核中' },
  { value: 'approved', label: '已核准' },
  { value: 'rejected', label: '已退回' },
  { value: 'void', label: '已作廢' },
];

const typeOptions = [
  { value: 'purchase', label: '採購合約' },
  { value: 'nda', label: '保密協議' },
  { value: 'service', label: '勞務合約' },
  { value: 'other', label: '其他' },
];

export default function ContractList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [status, setStatus] = useState<string | undefined>(searchParams.get('status') || undefined);
  const [contractType, setContractType] = useState<string | undefined>(
    searchParams.get('contract_type') || undefined
  );
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(Number(searchParams.get('page_size')) || 20);

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', { keyword, status, contract_type: contractType, page, page_size: pageSize }],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (keyword) params.keyword = keyword;
      if (status) params.status = status;
      if (contractType) params.contract_type = contractType;
      const res = await contractAPI.list(params);
      return res.data;
    },
  });

  const contracts: Contract[] = data?.items || data || [];
  const total: number = data?.total || contracts.length;

  const handleSearch = (value: string) => {
    setKeyword(value);
    setPage(1);
    updateSearchParams({ keyword: value, page: '1' });
  };

  const handleStatusChange = (value: string | undefined) => {
    setStatus(value);
    setPage(1);
    updateSearchParams({ status: value || '', page: '1' });
  };

  const handleTypeChange = (value: string | undefined) => {
    setContractType(value);
    setPage(1);
    updateSearchParams({ contract_type: value || '', page: '1' });
  };

  const updateSearchParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val) {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    });
    setSearchParams(params);
  };

  const columns: ColumnsType<Contract> = [
    {
      title: '合約編號',
      dataIndex: 'contract_no',
      key: 'contract_no',
      render: (text: string, record: Contract) => (
        <a onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${record.id}`); }}>
          {text}
        </a>
      ),
    },
    {
      title: '合約名稱',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '對方單位',
      dataIndex: 'counterparty',
      key: 'counterparty',
      ellipsis: true,
    },
    {
      title: '金額',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount: number | null) =>
        amount != null
          ? `NT$ ${amount.toLocaleString('zh-TW')}`
          : '-',
    },
    {
      title: '合約類型',
      dataIndex: 'contract_type',
      key: 'contract_type',
      render: (type: string | null) =>
        type ? <Tag>{contractTypeLabels[type] || type}</Tag> : '-',
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <ContractStatusBadge status={status} />,
    },
    {
      title: '更新時間',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (val: string | null) =>
        val ? new Date(val).toLocaleString('zh-TW') : '-',
    },
  ];

  return (
    <Card
      title="合約列表"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/contracts/new')}
        >
          建立合約
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="搜尋合約編號、名稱、對方單位"
          allowClear
          defaultValue={keyword}
          onSearch={handleSearch}
          style={{ width: 300 }}
          enterButton={<SearchOutlined />}
        />
        <Select
          placeholder="狀態篩選"
          allowClear
          value={status}
          onChange={handleStatusChange}
          options={statusOptions}
          style={{ width: 140 }}
        />
        <Select
          placeholder="合約類型"
          allowClear
          value={contractType}
          onChange={handleTypeChange}
          options={typeOptions}
          style={{ width: 140 }}
        />
      </Space>

      <Table<Contract>
        rowKey="id"
        columns={columns}
        dataSource={contracts}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 筆`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
            updateSearchParams({ page: String(p), page_size: String(ps) });
          },
        }}
        onRow={(record) => ({
          onClick: () => navigate(`/contracts/${record.id}`),
          style: { cursor: 'pointer' },
        })}
      />
    </Card>
  );
}
