'use client';

import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { Button } from './Button';

interface ErrorMessageProps {
  title?: string;
  message: string;
  action?: ReactNode;
  variant?: 'inline' | 'banner' | 'full';
  className?: string;
  onRetry?: () => void;
}

export function ErrorMessage({
  title,
  message,
  action,
  variant = 'banner',
  className,
  onRetry,
}: ErrorMessageProps) {
  if (variant === 'inline') {
    return (
      <div className={clsx('text-red-600 text-sm', className)}>
        {title && <span className="font-medium">{title}: </span>}
        {message}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={clsx('flex flex-col items-center justify-center py-16', className)}>
        <div className="w-16 h-16 mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900">{title || 'Something went wrong'}</h1>
        <p className="mt-2 text-slate-600 text-center max-w-md">{message}</p>
        {(action || onRetry) && (
          <div className="mt-6 flex gap-3">
            {onRetry && (
              <Button variant="secondary" onClick={onRetry}>
                Try Again
              </Button>
            )}
            {action}
          </div>
        )}
      </div>
    );
  }

  // Banner variant (default)
  return (
    <div
      className={clsx(
        'p-4 bg-red-50 border border-red-200 rounded-lg',
        className
      )}
    >
      <div className="flex gap-3">
        <svg
          className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div className="flex-1">
          {title && <h3 className="text-sm font-medium text-red-800">{title}</h3>}
          <p className={clsx('text-sm text-red-700', title && 'mt-1')}>{message}</p>
          {(action || onRetry) && (
            <div className="mt-3 flex gap-2">
              {onRetry && (
                <Button variant="ghost" size="sm" onClick={onRetry}>
                  Retry
                </Button>
              )}
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Success message variant
interface SuccessMessageProps {
  title?: string;
  message: string;
  className?: string;
}

export function SuccessMessage({ title, message, className }: SuccessMessageProps) {
  return (
    <div
      className={clsx(
        'p-4 bg-green-50 border border-green-200 rounded-lg',
        className
      )}
    >
      <div className="flex gap-3">
        <svg
          className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          {title && <h3 className="text-sm font-medium text-green-800">{title}</h3>}
          <p className={clsx('text-sm text-green-700', title && 'mt-1')}>{message}</p>
        </div>
      </div>
    </div>
  );
}

// Info message variant
interface InfoMessageProps {
  title?: string;
  message: string;
  className?: string;
}

export function InfoMessage({ title, message, className }: InfoMessageProps) {
  return (
    <div
      className={clsx(
        'p-4 bg-blue-50 border border-blue-200 rounded-lg',
        className
      )}
    >
      <div className="flex gap-3">
        <svg
          className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          {title && <h3 className="text-sm font-medium text-blue-800">{title}</h3>}
          <p className={clsx('text-sm text-blue-700', title && 'mt-1')}>{message}</p>
        </div>
      </div>
    </div>
  );
}

