'use client';

import { clsx } from 'clsx';
import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' | 'teal';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  teal: 'bg-blue-50 text-blue-700 border-blue-200',
};

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full border',
        variantStyles[variant],
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        className
      )}
    >
      {children}
    </span>
  );
}

// Helper function to get badge variant from case status
export function getStatusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'DRAFT':
      return 'default';
    case 'SUBMITTED':
      return 'info';
    case 'UNDER_REVIEW':
      return 'warning';
    case 'COMPLETED':
      return 'success';
    case 'FAILED':
      return 'error';
    case 'ASSIGNED':
      return 'info';
    case 'IN_PROGRESS':
      return 'warning';
    case 'EXPIRED':
      return 'error';
    default:
      return 'default';
  }
}

// Helper function to get badge variant from final_class result
export function getResultBadgeVariant(finalClass: string): BadgeVariant {
  switch (finalClass) {
    case 'APPROPRIATE':
      return 'success';
    case 'UNCERTAIN':
      return 'warning';
    case 'INAPPROPRIATE':
      return 'error';
    default:
      return 'default';
  }
}

// Format status for display
export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

// Format final_class for display
export function formatFinalClass(finalClass: string): string {
  return finalClass.charAt(0) + finalClass.slice(1).toLowerCase();
}

