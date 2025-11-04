import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    
    console.log('🔍 useInstallPrompt - Install Status:', {
      isStandalone,
      isIOSStandalone,
      displayMode: window.matchMedia('(display-mode: standalone)').matches,
      protocol: window.location.protocol,
      hasServiceWorker: 'serviceWorker' in navigator
    });

    if (isStandalone) {
      console.log('ℹ️ App already installed (standalone mode)');
      setIsInstalled(true);
      return;
    }

    // Check if running as iOS standalone app
    if (isIOSStandalone) {
      console.log('ℹ️ App already installed (iOS standalone)');
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('✅ beforeinstallprompt event fired!');
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event so it can be triggered later
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      console.log('🎉 App installed successfully!');
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
    };

    console.log('👂 Listening for beforeinstallprompt event...');
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      console.log('🧹 Cleaning up event listeners');
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) {
      console.warn('⚠️ No install prompt available');
      return false;
    }

    console.log('📱 Showing native install prompt...');
    // Show the install prompt
    await installPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    console.log('📊 User choice:', outcome);

    // Clear the saved prompt since it can't be used again
    setInstallPrompt(null);
    setIsInstallable(false);

    return outcome === 'accepted';
  };

  return {
    isInstallable,
    isInstalled,
    promptInstall,
  };
}
