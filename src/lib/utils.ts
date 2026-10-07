/**
 * Utility functions for the FairShare application
 */

import { currencyDigits } from './currencies';

/**
 * Format an amount in a currency's own minor unit: "$12.50", "IDR 900,000",
 * "¥1,200". Fixed locale and a static digits table so the server and the
 * browser render the same string (no hydration mismatch).
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const digits = currencyDigits(currency);
  const value = Object.is(amount, -0) ? 0 : amount;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(digits)}`;
  }
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string, timeZone?: string | null): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Calendar dates (expense dates, recurrence dates) are stored as UTC
  // midnight: read them in UTC so a browser west of UTC does not show the
  // previous day. Real timestamps use the given zone, else the runtime's zone
  // (which differs between server and browser: in client components render
  // timestamps through <LocalDate> to stay hydration-safe).
  const calendar = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
  const zone = calendar ? 'UTC' : timeZone || undefined;
  try {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', ...(zone ? { timeZone: zone } : {}) });
  } catch {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date | string, timeZone?: string | null): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  // Server-rendered timestamps: pass the viewer's saved time zone, otherwise
  // they come out in the server's zone.
  if (timeZone) {
    try {
      return d.toLocaleString('en-US', { ...opts, timeZone });
    } catch {
      /* unknown zone: fall through */
    }
  }
  return d.toLocaleString('en-US', opts);
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  return parts.slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
}

/**
 * Truncate text to specified length
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

/**
 * Calculate percentage
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return (part / total) * 100;
}

/**
 * Round to 2 decimal places
 */
export function round(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Check if two numbers are approximately equal (within 1 cent)
 */
export function isApproximatelyEqual(a: number, b: number, tolerance: number = 0.01): boolean {
  return Math.abs(a - b) <= tolerance;
}

/**
 * Generate a deterministic color for avatars based on input string
 */
export function generateAvatarColor(str: string): string {
  const colors = [
    'bg-red-100 text-red-600',
    'bg-blue-100 text-blue-600',
    'bg-green-100 text-green-600',
    'bg-yellow-100 text-yellow-600',
    'bg-purple-100 text-purple-600',
    'bg-pink-100 text-pink-600',
    'bg-indigo-100 text-indigo-600',
    'bg-teal-100 text-teal-600',
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length] || colors[0];
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sleep function for development/testing
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') {
    if (value instanceof Date) return false;
    return Object.keys(value as Record<string, unknown>).length === 0;
  }
  return false;
}
