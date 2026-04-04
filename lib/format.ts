import { formatDistanceToNow, format, isValid, parseISO } from 'date-fns';

/**
 * Format a date string to a human-readable format.
 * Returns empty string for null/undefined/invalid dates.
 */
export function formatDate(dateStr: string | null | undefined, style: 'short' | 'long' | 'relative' = 'short'): string {
  if (!dateStr) return '';
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  if (!isValid(date)) return '';

  switch (style) {
    case 'relative':
      return formatDistanceToNow(date, { addSuffix: true });
    case 'long':
      return format(date, 'MMMM d, yyyy');
    case 'short':
    default:
      return format(date, 'MMM d, yyyy');
  }
}

/**
 * Format a date with time.
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = parseISO(dateStr);
  if (!isValid(date)) return '';
  return format(date, 'MMM d, yyyy h:mm a');
}

/**
 * Format a currency value.
 */
export function formatCurrency(amount: number | null | undefined, options?: { compact?: boolean }): string {
  if (amount == null) return '$0';
  if (options?.compact && Math.abs(amount) >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (options?.compact && Math.abs(amount) >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a percentage.
 */
export function formatPercent(value: number | null | undefined, decimals = 0): string {
  if (value == null) return '0%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a number with locale-specific separators.
 */
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '0';
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Humanize a snake_case or camelCase status string.
 */
export function humanizeStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
