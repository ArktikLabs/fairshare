// Country calling codes for the WhatsApp number input. No default country:
// the user picks one (or types a full +number).

export interface PhoneCountry {
  iso: string;
  name: string;
  dial: string;
}

export const PHONE_COUNTRIES: ReadonlyArray<PhoneCountry> = [
  { iso: "AR", name: "Argentina", dial: "54" },
  { iso: "AU", name: "Australia", dial: "61" },
  { iso: "AT", name: "Austria", dial: "43" },
  { iso: "BD", name: "Bangladesh", dial: "880" },
  { iso: "BE", name: "Belgium", dial: "32" },
  { iso: "BR", name: "Brazil", dial: "55" },
  { iso: "BN", name: "Brunei", dial: "673" },
  { iso: "KH", name: "Cambodia", dial: "855" },
  { iso: "CA", name: "Canada", dial: "1" },
  { iso: "CL", name: "Chile", dial: "56" },
  { iso: "CN", name: "China", dial: "86" },
  { iso: "CO", name: "Colombia", dial: "57" },
  { iso: "CZ", name: "Czechia", dial: "420" },
  { iso: "DK", name: "Denmark", dial: "45" },
  { iso: "EG", name: "Egypt", dial: "20" },
  { iso: "FI", name: "Finland", dial: "358" },
  { iso: "FR", name: "France", dial: "33" },
  { iso: "DE", name: "Germany", dial: "49" },
  { iso: "GR", name: "Greece", dial: "30" },
  { iso: "HK", name: "Hong Kong", dial: "852" },
  { iso: "HU", name: "Hungary", dial: "36" },
  { iso: "IN", name: "India", dial: "91" },
  { iso: "ID", name: "Indonesia", dial: "62" },
  { iso: "IE", name: "Ireland", dial: "353" },
  { iso: "IL", name: "Israel", dial: "972" },
  { iso: "IT", name: "Italy", dial: "39" },
  { iso: "JP", name: "Japan", dial: "81" },
  { iso: "KE", name: "Kenya", dial: "254" },
  { iso: "KR", name: "South Korea", dial: "82" },
  { iso: "LA", name: "Laos", dial: "856" },
  { iso: "MY", name: "Malaysia", dial: "60" },
  { iso: "MX", name: "Mexico", dial: "52" },
  { iso: "MM", name: "Myanmar", dial: "95" },
  { iso: "NL", name: "Netherlands", dial: "31" },
  { iso: "NZ", name: "New Zealand", dial: "64" },
  { iso: "NG", name: "Nigeria", dial: "234" },
  { iso: "NO", name: "Norway", dial: "47" },
  { iso: "PK", name: "Pakistan", dial: "92" },
  { iso: "PE", name: "Peru", dial: "51" },
  { iso: "PH", name: "Philippines", dial: "63" },
  { iso: "PL", name: "Poland", dial: "48" },
  { iso: "PT", name: "Portugal", dial: "351" },
  { iso: "QA", name: "Qatar", dial: "974" },
  { iso: "RO", name: "Romania", dial: "40" },
  { iso: "SA", name: "Saudi Arabia", dial: "966" },
  { iso: "SG", name: "Singapore", dial: "65" },
  { iso: "ZA", name: "South Africa", dial: "27" },
  { iso: "ES", name: "Spain", dial: "34" },
  { iso: "LK", name: "Sri Lanka", dial: "94" },
  { iso: "SE", name: "Sweden", dial: "46" },
  { iso: "CH", name: "Switzerland", dial: "41" },
  { iso: "TW", name: "Taiwan", dial: "886" },
  { iso: "TH", name: "Thailand", dial: "66" },
  { iso: "TL", name: "Timor-Leste", dial: "670" },
  { iso: "TR", name: "Türkiye", dial: "90" },
  { iso: "AE", name: "United Arab Emirates", dial: "971" },
  { iso: "GB", name: "United Kingdom", dial: "44" },
  { iso: "US", name: "United States", dial: "1" },
  { iso: "VN", name: "Vietnam", dial: "84" },
];

/** Build E.164 from a picked country and a national number ("0812..." drops the trunk 0). */
export function toE164(dial: string | null, national: string): string | null {
  const raw = national.trim();
  if (raw.startsWith("+")) {
    const d = raw.replace(/\D/g, "");
    return /^[1-9]\d{7,14}$/.test(d) ? `+${d}` : null;
  }
  if (!dial) return null;
  const local = raw.replace(/\D/g, "").replace(/^0+/, "");
  const d = `${dial}${local}`;
  return local.length >= 4 && /^[1-9]\d{7,14}$/.test(d) ? `+${d}` : null;
}

/** "+6281234567890" -> "+62 812-3456-7890"-ish: country code then groups of 4 */
export function prettyPhone(e164: string): string {
  const d = e164.replace(/\D/g, "");
  const c = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((x) => d.startsWith(x.dial));
  if (!c) return e164;
  const rest = d.slice(c.dial.length);
  return `+${c.dial} ${rest.replace(/(\d{3,4})(?=(\d{4})+$)/g, "$1 ").trim()}`;
}
