import { Badge, Popover, List, Button, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationAPI } from '../api/client';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

export default function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.list().then(r => r.data),
    refetchInterval: 30000, // 每 30 秒輪詢
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationAPI.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: () => notificationAPI.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const content = (
    <div style={{ width: 360 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0 8px' }}>
        <Typography.Text strong>通知</Typography.Text>
        <Button type="link" size="small" onClick={() => markAll.mutate()}>全部已讀</Button>
      </div>
      <List
        size="small"
        dataSource={data?.notifications?.slice(0, 10) || []}
        locale={{ emptyText: '暫無通知' }}
        renderItem={(item: any) => (
          <List.Item
            style={{
              cursor: 'pointer',
              background: item.is_read ? 'transparent' : '#e6f4ff',
              padding: '8px 12px', borderRadius: 4,
            }}
            onClick={() => {
              markRead.mutate(item.id);
              if (item.contract_id) navigate(`/contracts/${item.contract_id}`);
            }}
          >
            <List.Item.Meta
              title={<span style={{ fontSize: 13 }}>{item.message}</span>}
              description={<span style={{ fontSize: 11 }}>{dayjs(item.created_at).format('MM/DD HH:mm')}</span>}
            />
          </List.Item>
        )}
      />
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="bottomRight">
      <Badge count={data?.unread_count || 0} size="small">
        <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
      </Badge>
    </Popover>
  );
}
