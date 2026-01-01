declare global {
  interface Window {
    paypal?: any;
  }
}

const buildSdkUrl = (clientId: string) =>
  `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription`;

let paypalLoaderPromise: Promise<any> | null = null;

export function loadPaypalSdk(clientId: string): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PayPal SDK can only load in the browser."));
  }
  if (window.paypal) {
    return Promise.resolve(window.paypal);
  }
  if (paypalLoaderPromise) {
    return paypalLoaderPromise;
  }
  paypalLoaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-pawnpoint-paypal-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.paypal));
      existing.addEventListener("error", () => {
        paypalLoaderPromise = null;
        reject(new Error("Failed to load PayPal SDK"));
      });
      return;
    }
    const script = document.createElement("script");
    script.src = buildSdkUrl(clientId);
    script.async = true;
    script.dataset.pawnpointPaypalSdk = "true";
    script.onload = () => resolve(window.paypal);
    script.onerror = () => {
      paypalLoaderPromise = null;
      reject(new Error("Failed to load PayPal SDK"));
    };
    document.head.appendChild(script);
  });
  return paypalLoaderPromise;
}
