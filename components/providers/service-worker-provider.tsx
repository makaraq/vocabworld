// Service Worker initialization component
// Handles SW registration and update notifications

'use client';

import { useEffect, useState } from 'react';
import { audioCacheManager } from '@/lib/audio-cache-manager';

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showUpdateToast, setShowUpdateToast] = useState(false);

  useEffect(() => {
    // Initialize service worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      audioCacheManager.initialize().then((success) => {
        if (success) {
          console.log('[App] Service Worker initialized');
        }
      }).catch((error) => {
        console.error('[App] Service Worker initialization failed:', error);
      });
    }

    // Listen for update events
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
      setShowUpdateToast(true);
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = () => {
    audioCacheManager.forceUpdate();
  };

  const dismissUpdate = () => {
    setShowUpdateToast(false);
  };

  return (
    <>
      {children}
      
      {/* Update notification toast */}
      {showUpdateToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  Update Available
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  A new version of Vocab World is available. Reload to update.
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdate}
                    className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                  >
                    Update Now
                  </button>
                  <button
                    onClick={dismissUpdate}
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>

              <button
                onClick={dismissUpdate}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
