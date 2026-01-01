declare global {
  interface Window {
    paypal?: any;
  }
}

const buildSdkUrl = (clientId: string, mode: "sandbox" | "live") => {
  const host = mode === "sandbox" ? "https://www.sandbox.paypal.com" : "https://www.paypal.com";
  return `${host}/sdk/js?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription`;
};

let paypalLoaderPromise: Promise<any> | null = null;
let activeEnv: "sandbox" | "live" | null = null;
let activeClient: string | null = null;

export function loadPaypalSdk(clientId: string, mode: "sandbox" | "live"): Promise<any> {
  if (!clientId || !clientId.trim()) {
    return Promise.reject(new Error("PayPal client ID is missing."));
  }
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PayPal SDK can only load in the browser."));
  }

  const expectedHost = mode === "sandbox" ? "sandbox.paypal.com" : "www.paypal.com";
  const existing = document.querySelector<HTMLScriptElement>('script[src*="paypal.com/sdk/js"]');
  if (existing) {
    const src = existing.getAttribute("src") || "";
    const hasClient = src.includes(encodeURIComponent(clientId)) || src.includes(clientId);
    const hasHost = src.includes(expectedHost);
    if (hasClient && hasHost) {
      if (window.paypal) {
        return Promise.resolve(window.paypal);
      }
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", () => resolve(window.paypal));
        existing.addEventListener("error", () => reject(new Error("Failed to load PayPal SDK")));
      });
    }
    // Mismatched script: remove and reload with correct host/client
    existing.remove();
    (window as any).paypal = undefined;
    activeEnv = null;
    activeClient = null;
    paypalLoaderPromise = null;
  }

  if (paypalLoaderPromise) {
    return paypalLoaderPromise;
  }

  paypalLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = buildSdkUrl(clientId, mode);
    script.async = true;
    script.dataset.pawnpointPaypalSdk = "true";
    script.dataset.paypalEnv = mode;
    script.dataset.paypalClientId = clientId;
    console.info(`[PawnPoint] Loading PayPal SDK (${mode}) from ${script.src}`);
    script.onload = () => {
      activeEnv = mode;
      activeClient = clientId;
      resolve(window.paypal);
    };
    script.onerror = () => {
      paypalLoaderPromise = null;
      activeEnv = null;
      activeClient = null;
      reject(new Error("Failed to load PayPal SDK"));
    };
    document.head.appendChild(script);
  });
  return paypalLoaderPromise;
}
