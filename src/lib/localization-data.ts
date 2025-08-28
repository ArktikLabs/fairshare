// Currency data with symbols and names
export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
];

// Common timezones grouped by region
export const TIMEZONES = [
  // Americas
  { zone: 'America/New_York', label: 'New York (EST)', region: 'Americas' },
  { zone: 'America/Chicago', label: 'Chicago (CST)', region: 'Americas' },
  { zone: 'America/Denver', label: 'Denver (MST)', region: 'Americas' },
  { zone: 'America/Los_Angeles', label: 'Los Angeles (PST)', region: 'Americas' },
  { zone: 'America/Toronto', label: 'Toronto', region: 'Americas' },
  { zone: 'America/Vancouver', label: 'Vancouver', region: 'Americas' },
  { zone: 'America/Mexico_City', label: 'Mexico City', region: 'Americas' },
  { zone: 'America/Sao_Paulo', label: 'São Paulo', region: 'Americas' },
  { zone: 'America/Buenos_Aires', label: 'Buenos Aires', region: 'Americas' },
  
  // Europe
  { zone: 'Europe/London', label: 'London (GMT)', region: 'Europe' },
  { zone: 'Europe/Paris', label: 'Paris (CET)', region: 'Europe' },
  { zone: 'Europe/Berlin', label: 'Berlin (CET)', region: 'Europe' },
  { zone: 'Europe/Rome', label: 'Rome (CET)', region: 'Europe' },
  { zone: 'Europe/Madrid', label: 'Madrid (CET)', region: 'Europe' },
  { zone: 'Europe/Amsterdam', label: 'Amsterdam (CET)', region: 'Europe' },
  { zone: 'Europe/Zurich', label: 'Zurich (CET)', region: 'Europe' },
  { zone: 'Europe/Stockholm', label: 'Stockholm (CET)', region: 'Europe' },
  { zone: 'Europe/Oslo', label: 'Oslo (CET)', region: 'Europe' },
  { zone: 'Europe/Copenhagen', label: 'Copenhagen (CET)', region: 'Europe' },
  { zone: 'Europe/Warsaw', label: 'Warsaw (CET)', region: 'Europe' },
  { zone: 'Europe/Prague', label: 'Prague (CET)', region: 'Europe' },
  { zone: 'Europe/Budapest', label: 'Budapest (CET)', region: 'Europe' },
  { zone: 'Europe/Moscow', label: 'Moscow (MSK)', region: 'Europe' },
  
  // Asia-Pacific
  { zone: 'Asia/Tokyo', label: 'Tokyo (JST)', region: 'Asia-Pacific' },
  { zone: 'Asia/Seoul', label: 'Seoul (KST)', region: 'Asia-Pacific' },
  { zone: 'Asia/Shanghai', label: 'Shanghai (CST)', region: 'Asia-Pacific' },
  { zone: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', region: 'Asia-Pacific' },
  { zone: 'Asia/Singapore', label: 'Singapore (SGT)', region: 'Asia-Pacific' },
  { zone: 'Asia/Bangkok', label: 'Bangkok (ICT)', region: 'Asia-Pacific' },
  { zone: 'Asia/Jakarta', label: 'Jakarta (WIB)', region: 'Asia-Pacific' },
  { zone: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (MYT)', region: 'Asia-Pacific' },
  { zone: 'Asia/Manila', label: 'Manila (PHT)', region: 'Asia-Pacific' },
  { zone: 'Asia/Kolkata', label: 'Mumbai/Kolkata (IST)', region: 'Asia-Pacific' },
  { zone: 'Australia/Sydney', label: 'Sydney (AEST)', region: 'Asia-Pacific' },
  { zone: 'Australia/Melbourne', label: 'Melbourne (AEST)', region: 'Asia-Pacific' },
  { zone: 'Pacific/Auckland', label: 'Auckland (NZST)', region: 'Asia-Pacific' },
  
  // Middle East & Africa
  { zone: 'Asia/Dubai', label: 'Dubai (GST)', region: 'Middle East & Africa' },
  { zone: 'Africa/Cairo', label: 'Cairo (EET)', region: 'Middle East & Africa' },
  { zone: 'Africa/Johannesburg', label: 'Johannesburg (SAST)', region: 'Middle East & Africa' },
  
  // UTC
  { zone: 'UTC', label: 'UTC (Coordinated Universal Time)', region: 'UTC' },
];

// Languages with native names and English names
export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
];

// Helper functions
export function getCurrencyByCode(code: string) {
  return CURRENCIES.find(currency => currency.code === code);
}

export function getTimezoneByZone(zone: string) {
  return TIMEZONES.find(timezone => timezone.zone === zone);
}

export function getLanguageByCode(code: string) {
  return LANGUAGES.find(language => language.code === code);
}

export function groupTimezonesByRegion() {
  const grouped: Record<string, typeof TIMEZONES> = {};
  TIMEZONES.forEach(timezone => {
    if (!grouped[timezone.region]) {
      grouped[timezone.region] = [];
    }
    grouped[timezone.region].push(timezone);
  });
  return grouped;
}
