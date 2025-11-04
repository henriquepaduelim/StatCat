import { useEffect, useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export function InstallPrompt() {
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      // Check if dismissal has expired (7 days)
      const expiryDate = new Date(dismissed);
      const now = new Date();
      if (expiryDate > now) {
        setIsDismissed(true);
        return;
      } else {
        // Expired, clear it
        localStorage.removeItem('pwa-install-dismissed');
      }
    }

    // Show prompt after a short delay
    // In development: instant, in production: 3 seconds
    if (isInstallable && !isInstalled) {
      const delay = import.meta.env.DEV ? 0 : 3000; // 3 seconds in production
      
      console.log('🔍 InstallPrompt Debug:', {
        isInstallable,
        isInstalled,
        isDismissed,
        delay,
        dismissed: localStorage.getItem('pwa-install-dismissed')
      });

      const timer = setTimeout(() => {
        console.log('✅ Showing install prompt');
        setShowPrompt(true);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    // Remember dismissal for 7 days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    localStorage.setItem('pwa-install-dismissed', expiryDate.toISOString());
  };

  if (!showPrompt || isDismissed || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-96 z-50 animate-slide-up">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">
                Install StatCat App
              </h3>
              <p className="mt-1 text-xs text-gray-600">
                Install our app for quick access, offline support, and a native experience.
              </p>
              
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleInstall}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition"
                >
                  Install
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-3 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 transition"
                >
                  Not now
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="bg-gray-50 px-4 py-2 text-[10px] text-gray-500 border-t border-gray-100">
          Works offline • Fast loading • Native experience
        </div>
      </div>
    </div>
  );
}
