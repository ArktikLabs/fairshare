// The one ISO 4217 currency list used everywhere (group create, account
// preferences, currency picker). Static on purpose: Intl data differs between
// Node and browsers, and a generated list would cause hydration mismatches.
// Generated from Intl.supportedValuesOf("currency"), minus funds, metals and
// withdrawn codes.

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export const CURRENCIES: ReadonlyArray<Currency> = [
  { code: "AED", name: "United Arab Emirates Dirham", symbol: "AED" },
  { code: "AFN", name: "Afghan Afghani", symbol: "؋" },
  { code: "ALL", name: "Albanian Lek", symbol: "ALL" },
  { code: "AMD", name: "Armenian Dram", symbol: "֏" },
  { code: "AOA", name: "Angolan Kwanza", symbol: "Kz" },
  { code: "ARS", name: "Argentine Peso", symbol: "$" },
  { code: "AUD", name: "Australian Dollar", symbol: "$" },
  { code: "AWG", name: "Aruban Florin", symbol: "AWG" },
  { code: "AZN", name: "Azerbaijani Manat", symbol: "₼" },
  { code: "BAM", name: "Bosnia-Herzegovina Convertible Mark", symbol: "KM" },
  { code: "BBD", name: "Barbadian Dollar", symbol: "$" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳" },
  { code: "BGN", name: "Bulgarian Lev", symbol: "BGN" },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BHD" },
  { code: "BIF", name: "Burundian Franc", symbol: "BIF" },
  { code: "BMD", name: "Bermudan Dollar", symbol: "$" },
  { code: "BND", name: "Brunei Dollar", symbol: "$" },
  { code: "BOB", name: "Bolivian Boliviano", symbol: "Bs" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "BSD", name: "Bahamian Dollar", symbol: "$" },
  { code: "BTN", name: "Bhutanese Ngultrum", symbol: "BTN" },
  { code: "BWP", name: "Botswanan Pula", symbol: "P" },
  { code: "BYN", name: "Belarusian Ruble", symbol: "BYN" },
  { code: "BZD", name: "Belize Dollar", symbol: "$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "$" },
  { code: "CDF", name: "Congolese Franc", symbol: "CDF" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CLP", name: "Chilean Peso", symbol: "$" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "COP", name: "Colombian Peso", symbol: "$" },
  { code: "CRC", name: "Costa Rican Col\u00f3n", symbol: "₡" },
  { code: "CUP", name: "Cuban Peso", symbol: "$" },
  { code: "CVE", name: "Cape Verdean Escudo", symbol: "CVE" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč" },
  { code: "DJF", name: "Djiboutian Franc", symbol: "DJF" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "DOP", name: "Dominican Peso", symbol: "$" },
  { code: "DZD", name: "Algerian Dinar", symbol: "DZD" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£" },
  { code: "ERN", name: "Eritrean Nakfa", symbol: "ERN" },
  { code: "ETB", name: "Ethiopian Birr", symbol: "ETB" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "FJD", name: "Fijian Dollar", symbol: "$" },
  { code: "FKP", name: "Falkland Islands Pound", symbol: "£" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "GEL", name: "Georgian Lari", symbol: "₾" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵" },
  { code: "GIP", name: "Gibraltar Pound", symbol: "£" },
  { code: "GMD", name: "Gambian Dalasi", symbol: "GMD" },
  { code: "GNF", name: "Guinean Franc", symbol: "FG" },
  { code: "GTQ", name: "Guatemalan Quetzal", symbol: "Q" },
  { code: "GYD", name: "Guyanaese Dollar", symbol: "$" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "$" },
  { code: "HNL", name: "Honduran Lempira", symbol: "L" },
  { code: "HTG", name: "Haitian Gourde", symbol: "HTG" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "ILS", name: "Israeli New Shekel", symbol: "₪" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "IQD", name: "Iraqi Dinar", symbol: "IQD" },
  { code: "IRR", name: "Iranian Rial", symbol: "IRR" },
  { code: "ISK", name: "Icelandic Kr\u00f3na", symbol: "kr" },
  { code: "JMD", name: "Jamaican Dollar", symbol: "$" },
  { code: "JOD", name: "Jordanian Dinar", symbol: "JOD" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KES" },
  { code: "KGS", name: "Kyrgyz Som", symbol: "⃀" },
  { code: "KHR", name: "Cambodian Riel", symbol: "៛" },
  { code: "KMF", name: "Comorian Franc", symbol: "CF" },
  { code: "KPW", name: "North Korean Won", symbol: "₩" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KWD" },
  { code: "KYD", name: "Cayman Islands Dollar", symbol: "$" },
  { code: "KZT", name: "Kazakhstani Tenge", symbol: "₸" },
  { code: "LAK", name: "Laotian Kip", symbol: "₭" },
  { code: "LBP", name: "Lebanese Pound", symbol: "L£" },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs" },
  { code: "LRD", name: "Liberian Dollar", symbol: "$" },
  { code: "LSL", name: "Lesotho Loti", symbol: "LSL" },
  { code: "LYD", name: "Libyan Dinar", symbol: "LYD" },
  { code: "MAD", name: "Moroccan Dirham", symbol: "MAD" },
  { code: "MDL", name: "Moldovan Leu", symbol: "MDL" },
  { code: "MGA", name: "Malagasy Ariary", symbol: "Ar" },
  { code: "MKD", name: "Macedonian Denar", symbol: "MKD" },
  { code: "MMK", name: "Myanmar Kyat", symbol: "K" },
  { code: "MNT", name: "Mongolian Tugrik", symbol: "₮" },
  { code: "MOP", name: "Macanese Pataca", symbol: "MOP" },
  { code: "MRU", name: "Mauritanian Ouguiya", symbol: "MRU" },
  { code: "MUR", name: "Mauritian Rupee", symbol: "Rs" },
  { code: "MVR", name: "Maldivian Rufiyaa", symbol: "MVR" },
  { code: "MWK", name: "Malawian Kwacha", symbol: "MWK" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "MZN", name: "Mozambican Metical", symbol: "MZN" },
  { code: "NAD", name: "Namibian Dollar", symbol: "$" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "NIO", name: "Nicaraguan C\u00f3rdoba", symbol: "C$" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "NPR", name: "Nepalese Rupee", symbol: "Rs" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "$" },
  { code: "OMR", name: "Omani Rial", symbol: "OMR" },
  { code: "PAB", name: "Panamanian Balboa", symbol: "PAB" },
  { code: "PEN", name: "Peruvian Sol", symbol: "PEN" },
  { code: "PGK", name: "Papua New Guinean Kina", symbol: "PGK" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "Rs" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  { code: "PYG", name: "Paraguayan Guarani", symbol: "₲" },
  { code: "QAR", name: "Qatari Riyal", symbol: "QAR" },
  { code: "RON", name: "Romanian Leu", symbol: "lei" },
  { code: "RSD", name: "Serbian Dinar", symbol: "RSD" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽" },
  { code: "RWF", name: "Rwandan Franc", symbol: "RF" },
  { code: "SAR", name: "Saudi Riyal", symbol: "SAR" },
  { code: "SBD", name: "Solomon Islands Dollar", symbol: "$" },
  { code: "SCR", name: "Seychellois Rupee", symbol: "SCR" },
  { code: "SDG", name: "Sudanese Pound", symbol: "SDG" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "SGD", name: "Singapore Dollar", symbol: "$" },
  { code: "SHP", name: "St. Helena Pound", symbol: "£" },
  { code: "SLE", name: "Sierra Leonean Leone", symbol: "SLE" },
  { code: "SOS", name: "Somali Shilling", symbol: "SOS" },
  { code: "SRD", name: "Surinamese Dollar", symbol: "$" },
  { code: "SSP", name: "South Sudanese Pound", symbol: "£" },
  { code: "STN", name: "S\u00e3o Tom\u00e9 & Pr\u00edncipe Dobra", symbol: "Db" },
  { code: "SYP", name: "Syrian Pound", symbol: "£" },
  { code: "SZL", name: "Swazi Lilangeni", symbol: "SZL" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "TJS", name: "Tajikistani Somoni", symbol: "TJS" },
  { code: "TMT", name: "Turkmenistani Manat", symbol: "TMT" },
  { code: "TND", name: "Tunisian Dinar", symbol: "TND" },
  { code: "TOP", name: "Tongan Pa\u02bbanga", symbol: "T$" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "TTD", name: "Trinidad & Tobago Dollar", symbol: "$" },
  { code: "TWD", name: "New Taiwan Dollar", symbol: "$" },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TZS" },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "₴" },
  { code: "UGX", name: "Ugandan Shilling", symbol: "UGX" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "UYU", name: "Uruguayan Peso", symbol: "$" },
  { code: "UZS", name: "Uzbekistani Som", symbol: "UZS" },
  { code: "VES", name: "Venezuelan Bol\u00edvar", symbol: "VES" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫" },
  { code: "VUV", name: "Vanuatu Vatu", symbol: "VUV" },
  { code: "WST", name: "Samoan Tala", symbol: "WST" },
  { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA" },
  { code: "XCD", name: "East Caribbean Dollar", symbol: "$" },
  { code: "XCG", name: "Caribbean guilder", symbol: "Cg." },
  { code: "XOF", name: "West African CFA Franc", symbol: "F CFA" },
  { code: "XPF", name: "CFP Franc", symbol: "CFPF" },
  { code: "YER", name: "Yemeni Rial", symbol: "YER" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "ZMW", name: "Zambian Kwacha", symbol: "ZK" },
  { code: "ZWG", name: "Zimbabwean Gold", symbol: "ZWG" },
];

/** Shown first in pickers. */
export const POPULAR_CURRENCIES = ["USD", "EUR", "GBP", "IDR", "SGD", "MYR", "AUD", "JPY", "INR", "CAD"] as const;

export const DEFAULT_CURRENCY = "USD";

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function getCurrency(code: string | null | undefined): Currency | undefined {
  return code ? BY_CODE.get(code.toUpperCase()) : undefined;
}

export function isSupportedCurrency(code: unknown): code is string {
  return typeof code === "string" && BY_CODE.has(code);
}

/** A user's preferred currency if valid, otherwise USD. */
export function resolveCurrency(preferred: string | null | undefined): string {
  return preferred && BY_CODE.has(preferred) ? preferred : DEFAULT_CURRENCY;
}

/** Case-insensitive search on code, name and symbol; popular codes first. */
export function searchCurrencies(query: string): Currency[] {
  const q = query.trim().toLowerCase();
  const hits = q
    ? CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase() === q
      )
    : [...CURRENCIES];
  const rank = (c: Currency) => {
    if (q && c.code.toLowerCase() === q) return -2;
    const p = (POPULAR_CURRENCIES as readonly string[]).indexOf(c.code);
    return p === -1 ? 100 : p;
  };
  return hits.sort((a, b) => rank(a) - rank(b) || a.code.localeCompare(b.code));
}
