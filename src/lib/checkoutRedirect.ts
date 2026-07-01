const CHECKOUT_RETURN_STORAGE_KEY = "pawnpoint_checkout_return_to";

export function normalizeCheckoutReturnPath(value?: string | null) {
  const path = (value || "").trim();
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "";
  if (path.startsWith("/checkout")) return "";
  return path;
}

export function rememberCheckoutReturnPath(value?: string | null) {
  const safeReturnTo = normalizeCheckoutReturnPath(value);
  if (!safeReturnTo || typeof window === "undefined") return "";
  try {
    window.sessionStorage.setItem(CHECKOUT_RETURN_STORAGE_KEY, safeReturnTo);
  } catch {
    // Storage can be unavailable in private browsing or locked-down contexts.
  }
  return safeReturnTo;
}

export function getRememberedCheckoutReturnPath() {
  if (typeof window === "undefined") return "";
  try {
    return normalizeCheckoutReturnPath(window.sessionStorage.getItem(CHECKOUT_RETURN_STORAGE_KEY));
  } catch {
    return "";
  }
}

export function checkoutPath(returnTo?: string | null) {
  const safeReturnTo = rememberCheckoutReturnPath(returnTo);
  if (!safeReturnTo) return "/checkout";
  return `/checkout?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export function checkoutReturnPath(search: string) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return normalizeCheckoutReturnPath(params.get("returnTo")) || getRememberedCheckoutReturnPath() || "/";
}
