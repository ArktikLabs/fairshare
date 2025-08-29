// Format currency with proper symbol and locale
export function formatCurrency(amount: number, currencyCode: string = 'USD', locale: string = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch {
    // Fallback if currency/locale is not supported
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

// Format date/time for user's timezone
export function formatDateTime(date: Date | string, timezone: string = 'UTC', locale: string = 'en-US'): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  } catch {
    // Fallback if timezone is not supported
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  }
}

// Get current time in user's timezone
export function getCurrentTime(timezone: string = 'UTC', locale: string = 'en-US'): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }).format(new Date());
  } catch {
    // Fallback
    return new Date().toLocaleTimeString();
  }
}

// Validate timezone string
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

// Validate currency code
export function isValidCurrency(currency: string): boolean {
  try {
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    });
    return true;
  } catch {
    return false;
  }
}

// Validate language code
export function isValidLocale(locale: string): boolean {
  try {
    new Intl.DateTimeFormat(locale);
    return true;
  } catch {
    return false;
  }
}

// Get relative time (e.g., "2 hours ago", "in 3 days")
export function getRelativeTime(date: Date | string, timezone: string = 'UTC', locale: string = 'en-US'): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    
    // Convert both dates to the same timezone for comparison
    const formatter = new Intl.DateTimeFormat(locale, { timeZone: timezone });
    const targetTime = new Date(formatter.format(dateObj));
    const currentTime = new Date(formatter.format(now));
    
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const diffInSeconds = (targetTime.getTime() - currentTime.getTime()) / 1000;
    
    if (Math.abs(diffInSeconds) < 60) {
      return rtf.format(Math.round(diffInSeconds), 'second');
    } else if (Math.abs(diffInSeconds) < 3600) {
      return rtf.format(Math.round(diffInSeconds / 60), 'minute');
    } else if (Math.abs(diffInSeconds) < 86400) {
      return rtf.format(Math.round(diffInSeconds / 3600), 'hour');
    } else {
      return rtf.format(Math.round(diffInSeconds / 86400), 'day');
    }
  } catch {
    // Fallback
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  }
}
