'use client';

import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8' : 'py-12',
        className
      )}
    >
      {icon && (
        <div className={clsx('text-slate-300', compact ? 'mb-3' : 'mb-4')}>
          {icon}
        </div>
      )}
      <h3 className={clsx('font-medium text-slate-900', compact ? 'text-sm' : 'text-base')}>
        {title}
      </h3>
      {description && (
        <p className={clsx('mt-1 text-slate-500', compact ? 'text-xs' : 'text-sm')}>
          {description}
        </p>
      )}
      {action && <div className={clsx(compact ? 'mt-3' : 'mt-4')}>{action}</div>}
    </div>
  );
}

// Pre-built empty states for common scenarios
export function NoCasesEmptyState({
  canCreate = false,
  hasFilters = false,
}: {
  canCreate?: boolean;
  hasFilters?: boolean;
}) {
  return (
    <EmptyState
      icon={
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      }
      title="No cases found"
      description={
        hasFilters
          ? 'Try adjusting your filters'
          : canCreate
          ? 'Create your first case to get started'
          : 'No cases are available'
      }
    />
  );
}

export function NoReviewsEmptyState({ isExpert = false }: { isExpert?: boolean }) {
  return (
    <EmptyState
      icon={
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      }
      title={isExpert ? 'No reviews pending' : 'No reviews found'}
      description={
        isExpert
          ? "You'll see assigned cases here when they arrive"
          : 'Reviews will appear here when available'
      }
    />
  );
}

export function NoNotificationsEmptyState() {
  return (
    <EmptyState
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
      title="You're all caught up!"
      description="No new notifications"
    />
  );
}

export function NoUsersEmptyState() {
  return (
    <EmptyState
      icon={
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      }
      title="No users found"
      description="There are no users in this view"
    />
  );
}

