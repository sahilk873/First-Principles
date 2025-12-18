'use client';

import { clsx } from 'clsx';
import { ReactNode } from 'react';

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="w-full">{children}</table>
    </div>
  );
}

interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

export function TableHeader({ children, className }: TableHeaderProps) {
  return (
    <thead className={clsx('border-b border-slate-200', className)}>
      <tr>{children}</tr>
    </thead>
  );
}

interface TableHeadProps {
  children?: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function TableHead({ children, className, align = 'left' }: TableHeadProps) {
  return (
    <th
      className={clsx(
        'px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider',
        align === 'left' && 'text-left',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
    >
      {children}
    </th>
  );
}

interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

export function TableBody({ children, className }: TableBodyProps) {
  return <tbody className={clsx('divide-y divide-slate-100', className)}>{children}</tbody>;
}

interface TableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  clickable?: boolean;
}

export function TableRow({ children, className, onClick, clickable = false }: TableRowProps) {
  return (
    <tr
      onClick={onClick}
      className={clsx(
        'transition-colors',
        clickable && 'cursor-pointer hover:bg-slate-50',
        className
      )}
    >
      {children}
    </tr>
  );
}

interface TableCellProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  colSpan?: number;
}

export function TableCell({ children, className, align = 'left', colSpan }: TableCellProps) {
  return (
    <td
      colSpan={colSpan}
      className={clsx(
        'px-4 py-3 text-sm text-slate-700',
        align === 'left' && 'text-left',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
    >
      {children}
    </td>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function TableEmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <tr>
      <td colSpan={100} className="px-4 py-12">
        <div className="flex flex-col items-center justify-center text-center">
          {icon && <div className="mb-4 text-slate-300">{icon}</div>}
          <h3 className="text-sm font-medium text-slate-900">{title}</h3>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          {action && <div className="mt-4">{action}</div>}
        </div>
      </td>
    </tr>
  );
}

