import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerSW } from "virtual:pwa-register";

import App from "./App";
import "./styles/index.css";
import LocaleProvider from "./i18n/LocaleProvider";
import ThemeProvider from "./theme/ThemeProvider";

const queryClient = new QueryClient();

registerSW({
  immediate: true,
  onNeedRefresh: () => {
    // Force reload so cached SW assets don't serve old UI
    location.reload();
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ThemeProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
          </BrowserRouter>
        </ThemeProvider>
      </LocaleProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
