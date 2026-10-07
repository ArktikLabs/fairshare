// Reserved / non-deliverable email domains (RFC 2606, RFC 6761).
// Mail to these never reaches anyone and bounces hurt the sender reputation,
// so the mailer refuses them and outbox rows for them are SKIPPED.
// Test accounts (smoke tests, demos) use these domains on purpose.

const RESERVED_TLDS = ["invalid", "test", "example", "localhost"];
const RESERVED_DOMAINS = ["example.com", "example.net", "example.org"];

export const RESERVED_DOMAIN_REASON = "Reserved test domain (RFC 2606/6761), not sent";

/** Domain part of an address, lowercased, without a trailing dot. */
export function emailDomain(address: string): string | null {
  const at = address.trim().lastIndexOf("@");
  if (at < 1) return null;
  const domain = address.trim().slice(at + 1).toLowerCase().replace(/\.+$/, "");
  return domain || null;
}

/** True when the address can never be delivered (reserved TLD or example domain, or no domain at all). */
export function isReservedEmail(address: string | null | undefined): boolean {
  if (!address) return true;
  const domain = emailDomain(address);
  if (!domain) return true;
  const labels = domain.split(".");
  const tld = labels[labels.length - 1];
  if (RESERVED_TLDS.includes(tld)) return true;
  return RESERVED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}
