import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import { installApiMocks } from "./lib/apiMocks";

installApiMocks();
const resolvedAppEnv =
  (import.meta.env.VITE_APP_ENV as string | undefined)?.toLowerCase() ||
  (import.meta.env.MODE === "production" ? "live" : "sandbox");
const appEnv = resolvedAppEnv === "sandbox" ? "sandbox" : "live";
console.info(`[PawnPoint] PayPal mode: ${appEnv}`);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
