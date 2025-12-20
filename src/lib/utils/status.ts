export type StatusBadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'purple'
  | 'teal';

export function getStatusBadgeVariant(status: string): StatusBadgeVariant {
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

export function getResultBadgeVariant(finalClass: string): StatusBadgeVariant {
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

export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatFinalClass(finalClass: string): string {
  if (!finalClass) {
    return '';
  }
  return finalClass.charAt(0).toUpperCase() + finalClass.slice(1).toLowerCase();
}
