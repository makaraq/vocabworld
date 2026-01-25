// Example: How to integrate cache management into account page
// Add this section to your existing account page

'use client';

import { CacheStatusPanel } from '@/components/audio/cache-status-panel';

export function AccountPageWithCache() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Your existing account sections */}
      
      {/* Add this new section for offline downloads */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Offline Downloads</h2>
        <p className="text-white/70 text-sm">
          Download audio files to your device for offline learning. Perfect for learning on the go without internet connection.
        </p>
        
        <CacheStatusPanel />
      </section>

      {/* Rest of your account page */}
    </div>
  );
}
