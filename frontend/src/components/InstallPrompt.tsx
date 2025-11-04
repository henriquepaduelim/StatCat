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
  }, [isInstalled]);

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
  }, [isInstallable, isInstalled]);

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

  // Safari Instructions Banner
  if (showSafariInstructions && !isDismissed && !isInstalled) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 animate-slideDown">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-100 mt-0.5">
                    {isIOSSafari() 
                      ? 'Tap Share → Add to Home Screen to install this app.'
                      : 'Tap ⋮ in your browser and select Add to Home screen to install.'
                    }
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 text-sm font-medium text-white hover:text-blue-100 transition flex-shrink-0"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chrome/Edge Install Prompt
  if (!showPrompt || isDismissed || isInstalled) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slideDown">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  Install StatCat App
                </p>
                <p className="text-xs text-blue-100">
                  Quick access, offline support, and native experience
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleInstall}
                className="px-4 py-2 bg-white text-blue-600 text-sm font-medium rounded-md hover:bg-blue-50 transition whitespace-nowrap"
              >
                Install Now
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-2 text-sm font-medium text-white hover:text-blue-100 transition whitespace-nowrap"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
