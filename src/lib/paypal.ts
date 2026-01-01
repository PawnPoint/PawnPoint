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
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PayPal SDK can only load in the browser."));
  }
  if (window.paypal) {
    if (activeEnv === mode && activeClient === clientId) {
      return Promise.resolve(window.paypal);
    }
    // env/client mismatch; clear and reload
    const scripts = Array.from(
      document.querySelectorAll<HTMLScriptElement>('script[data-pawnpoint-paypal-sdk="true"]'),
    );
    scripts.forEach((s) => s.remove());
    (window as any).paypal = undefined;
    activeEnv = null;
    activeClient = null;
    paypalLoaderPromise = null;
  }
  if (paypalLoaderPromise) {
    return paypalLoaderPromise;
  }
  paypalLoaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-pawnpoint-paypal-sdk="true"][data-paypal-env]',
    );
    if (existing) {
      const existingEnv = existing.dataset.paypalEnv;
      const existingClient = existing.dataset.paypalClientId;
      if (existingEnv === mode && existingClient === clientId) {
        existing.addEventListener("load", () => resolve(window.paypal));
        existing.addEventListener("error", () => {
          paypalLoaderPromise = null;
          reject(new Error("Failed to load PayPal SDK"));
        });
        return;
      }
      // if mismatched env or client, remove and reload
      existing.remove();
    }
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
