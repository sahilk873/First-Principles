'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Notification } from '@/types/database';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmptyState } from '@/components/ui/Table';
import { formatDateTime, formatRelativeTime } from '@/lib/utils/date';
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/actions/admin';

interface NotificationsTableProps {
  notifications: Notification[];
  unreadCount: number;
  initialFilter: string;
}

export function NotificationsTable({ notifications, unreadCount, initialFilter }: NotificationsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState(initialFilter);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    const params = new URLSearchParams(searchParams.toString());
    if (newFilter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', newFilter);
    }
    router.push(`/notifications?${params.toString()}`);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      startTransition(async () => {
        await markNotificationAsRead(notification.id);
      });
    }

    // Navigate based on notification type
    const payload = notification.payload as { caseId?: string; reviewId?: string };
    if (payload.reviewId) {
      router.push(`/reviews/${payload.reviewId}`);
    } else if (payload.caseId) {
      if (notification.type === 'CASE_RESULT_READY') {
        router.push(`/cases/${payload.caseId}/result`);
      } else {
        router.push(`/cases/${payload.caseId}`);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    startTransition(async () => {
      await markAllNotificationsAsRead();
      router.refresh();
    });
  };

  const getNotificationMessage = (notification: Notification) => {
    const payload = notification.payload as { caseId?: string; reviewId?: string };
    switch (notification.type) {
      case 'CASE_ASSIGNED':
        return `New case assigned for your expert review`;
      case 'CASE_RESULT_READY':
        return `Results are ready for case ${payload.caseId?.slice(0, 8)}...`;
      case 'REVIEW_REMINDER':
        return `Reminder: You have a pending review`;
      case 'SYSTEM_MESSAGE':
        return 'System notification';
      default:
        return 'New notification';
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'CASE_ASSIGNED':
        return 'info';
      case 'CASE_RESULT_READY':
        return 'success';
      case 'REVIEW_REMINDER':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatType = (type: string) => {
    switch (type) {
      case 'CASE_ASSIGNED':
        return 'Case Assigned';
      case 'CASE_RESULT_READY':
        return 'Result Ready';
      case 'REVIEW_REMINDER':
        return 'Reminder';
      case 'SYSTEM_MESSAGE':
        return 'System';
      default:
        return type;
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Notifications' },
    { value: 'unread', label: 'Unread Only' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-slate-600">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : "You're all caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            onClick={handleMarkAllAsRead}
            disabled={isPending}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-4">
        <Select
          options={filterOptions}
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="w-48"
        />
        {filter === 'unread' && (
          <Badge variant="info">{unreadCount} unread</Badge>
        )}
      </div>

      {/* Notifications Table */}
      <Card padding="none">
        <Table>
          <TableHeader>
            <TableHead>Type</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
          </TableHeader>
          <TableBody>
            {notifications.length === 0 ? (
              <TableEmptyState
                title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                description={
                  filter === 'unread'
                    ? "You've read all your notifications"
                    : "You'll receive notifications when cases are assigned or results are ready"
                }
                icon={
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                }
              />
            ) : (
              notifications.map((notification) => (
                <TableRow
                  key={notification.id}
                  clickable
                  onClick={() => handleNotificationClick(notification)}
                  className={!notification.is_read ? 'bg-blue-50/50' : ''}
                >
                  <TableCell>
                    <Badge variant={getTypeBadgeVariant(notification.type) as 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'}>
                      {formatType(notification.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                      <span className={!notification.is_read ? 'font-medium text-slate-900' : 'text-slate-600'}>
                        {getNotificationMessage(notification)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-slate-500">{formatRelativeTime(notification.created_at)}</span>
                      <span className="text-xs text-slate-400">{formatDateTime(notification.created_at)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {notification.is_read ? (
                      <span className="text-slate-400">Read</span>
                    ) : (
                      <span className="font-medium text-blue-600">Unread</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

