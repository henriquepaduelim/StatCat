import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App";
import "./styles/index.css";
import LocaleProvider from "./i18n/LocaleProvider";

const hideSplashScreen = () => {
  const splash = document.getElementById("pwa-splash");
  if (!splash) return;
  splash.classList.add("splash-hidden");
  splash.addEventListener(
    "transitionend",
    () => {
      splash.remove();
    },
    { once: true }
  );
};

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </BrowserRouter>
      </LocaleProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

requestAnimationFrame(hideSplashScreen);
