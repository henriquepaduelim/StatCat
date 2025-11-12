import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App";
import "./styles/index.css";
import LocaleProvider from "./i18n/LocaleProvider";

const MIN_SPLASH_DURATION = 1500;
const splashMountedAt = performance.now();

const removeSplashBackground = () => {
  document.body.classList.remove("pwa-splash-active");
};

const hideSplashScreen = () => {
  const splash = document.getElementById("pwa-splash");
  if (!splash) {
    removeSplashBackground();
    return;
  }
  if (splash.classList.contains("splash-hidden")) {
    removeSplashBackground();
    return;
  }
  splash.classList.add("splash-hidden");
  splash.addEventListener(
    "transitionend",
    () => {
      splash.remove();
      removeSplashBackground();
    },
    { once: true }
  );
};

const scheduleSplashRemoval = () => {
  const elapsed = performance.now() - splashMountedAt;
  const delay = Math.max(MIN_SPLASH_DURATION - elapsed, 0);
  window.setTimeout(hideSplashScreen, delay);
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

if (document.readyState === "complete") {
  scheduleSplashRemoval();
} else {
  window.addEventListener("load", scheduleSplashRemoval, { once: true });
}
