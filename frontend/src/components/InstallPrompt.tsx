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
    <div className="fixed top-0 left-0 right-0 z-50 animate-slideDown">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📱</span>
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  Instale o StatCat App
                </p>
                <p className="text-xs text-blue-100">
                  Acesso rápido, offline e experiência nativa
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleInstall}
                className="px-4 py-2 bg-white text-blue-600 text-sm font-medium rounded-md hover:bg-blue-50 transition"
              >
                Instalar Agora
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-2 text-sm font-medium text-white hover:text-blue-100 transition"
              >
                Não, obrigado
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
