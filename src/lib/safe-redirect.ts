/** Read ?callbackUrl= from the current URL and only allow same-site paths. */
export function getCallbackUrl(fallback = "/dashboard"): string {
  if (typeof window === "undefined") return fallback;
  const value = new URLSearchParams(window.location.search).get("callbackUrl");
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
