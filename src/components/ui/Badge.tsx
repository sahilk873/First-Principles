'use client';

import { clsx } from 'clsx';
import { ReactNode } from 'react';
import type { StatusBadgeVariant } from '@/lib/utils/status';
import {
  getStatusBadgeVariant,
  getResultBadgeVariant,
  formatStatus,
  formatFinalClass,
} from '@/lib/utils/status';

type BadgeVariant = StatusBadgeVariant;

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

export {
  getStatusBadgeVariant,
  getResultBadgeVariant,
  formatStatus,
  formatFinalClass,
};
