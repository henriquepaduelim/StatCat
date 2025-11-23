import { useEffect, useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

// Helper to detect iOS Safari
const isIOSSafari = () => {
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const iOSSafari = iOS && webkit && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
  return iOSSafari;
};

// Helper to detect Android
const isAndroid = () => {
  const ua = window.navigator.userAgent;
  return /Android/.test(ua);
};

// Helper to detect if is mobile (iOS or Android)
const isMobile = () => {
  return isIOSSafari() || isAndroid();
};

export function InstallPrompt() {
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showSafariInstructions, setShowSafariInstructions] = useState(false);

  useEffect(() => {
    // Only show on mobile (iOS or Android), not on desktop
    if (!isMobile() || isInstalled || window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if user previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const expiryDate = new Date(dismissed);
      const now = new Date();
      if (expiryDate > now) {
        setIsDismissed(true);
        return;
      } else {
        localStorage.removeItem('pwa-install-dismissed');
      }
    }

    // Show mobile-specific instructions after delay
    const delay = import.meta.env.DEV ? 0 : 3000;
    const timer = setTimeout(() => {
      setShowSafariInstructions(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [isInstalled, isDismissed]);

  // This effect handles the Chrome/Edge install prompt (beforeinstallprompt event)
  // Only for browsers that support it (Android Chrome, Edge, etc.)
  useEffect(() => {
    // Only show on Android if installable, not on iOS or desktop
    if (!isAndroid() || !isInstallable || isInstalled) {
      return;
    }

    // Check if user previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const expiryDate = new Date(dismissed);
      const now = new Date();
      if (expiryDate > now) {
        setIsDismissed(true);
        return;
      } else {
        localStorage.removeItem('pwa-install-dismissed');
      }
    }

    // Show prompt after a short delay
    const delay = import.meta.env.DEV ? 0 : 3000;
    
    console.log('[InstallPrompt] Debug:', {
      isInstallable,
      isInstalled,
      isDismissed,
      delay,
      dismissed: localStorage.getItem('pwa-install-dismissed')
    });

    const timer = setTimeout(() => {
      console.log('[InstallPrompt] Showing install prompt');
      setShowPrompt(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, isDismissed]);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowSafariInstructions(false);
    setIsDismissed(true);
    // Remember dismissal for 7 days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    localStorage.setItem('pwa-install-dismissed', expiryDate.toISOString());
  };

  const shouldShowSafariBanner = showSafariInstructions && !isDismissed && !isInstalled;
  const shouldShowInstallPrompt = showPrompt && !isDismissed && !isInstalled;

  if (!shouldShowSafariBanner && !shouldShowInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white/95 p-4 text-container-foreground shadow-2xl backdrop-blur">
        {shouldShowSafariBanner ? (
          <div className="flex items-start gap-3">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="flex-1 text-sm">
              <p className="font-semibold">Install StatCat</p>
              <p className="text-xs text-muted mt-1">
                {isIOSSafari()
                  ? "Tap Share → Add to Home Screen to install this app on your device."
                  : "Tap ⋮ in your browser and select Add to Home screen to install."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Got it
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-1 items-center gap-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div className="flex-1 text-sm">
                <p className="font-semibold">Install StatCat</p>
                <p className="text-xs text-muted">Quick access, offline support, and native experience</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleInstall}
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-500"
              >
                Install
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs font-semibold text-muted hover:text-container-foreground"
              >
                Later
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
