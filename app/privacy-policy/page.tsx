'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PrivacyPolicyPage() {
  const router = useRouter()

  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundImage: "url('/bg.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="min-h-screen bg-black/40 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
          </div>

          {/* Content */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-white space-y-6">
            <div>
              <p className="text-white/80 text-sm">Last updated: June 26, 2026</p>
            </div>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
              <p className="text-white/90 leading-relaxed">
                Welcome to Sprind ("we," "our," or "us"). We are committed to protecting your privacy and personal data. 
                This Privacy Policy explains how we collect, use, store, and protect your information when you use our 
                language learning application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data We Collect</h2>
              <div className="space-y-3 text-white/90">
                <div>
                  <h3 className="text-lg font-medium mb-2">Account Information</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Email address (collected via Google or Apple OAuth)</li>
                    <li>Name and profile picture (from OAuth provider)</li>
                    <li>User ID (generated automatically)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Learning Data</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Learning progress and vocabulary statistics</li>
                    <li>Selected native and target languages</li>
                    <li>Custom playlists and word collections</li>
                    <li>Topic completion status</li>
                    <li>Quiz and spaced-repetition review results</li>
                    <li>Achievements and milestones earned</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Subscription Information</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Subscription status and tier</li>
                    <li>Payment history (processed by RevenueCat and the App Store/Play Store, not stored by us)</li>
                    <li>Subscription renewal dates</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Learning Progress Data</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Words played and completion status (required for core app functionality)</li>
                    <li>Daily learning streaks</li>
                    <li>Device information (for mobile app functionality)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Leaderboard Information (Optional)</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>The leaderboard is turned <strong>off by default</strong>. It is shown only if you choose to opt in from your settings.</li>
                    <li>When you opt in, other users can see your first name, profile picture, number of words played, and current learning streak.</li>
                    <li>You can leave the leaderboard at any time, which immediately removes your information from public view.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">How We Use Your Data</h2>
              <p className="text-white/90 leading-relaxed mb-3">
                Your data is used solely for the following purposes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-white/90 ml-4">
                <li>Providing personalized language learning experiences</li>
                <li>Managing your subscription and account access</li>
                <li>Tracking your learning progress across devices</li>
                <li>Displaying your first name and progress on the leaderboard (only if you opt in)</li>
                <li>Improving app features and user experience</li>
                <li>Scheduling optional learning reminders on your device</li>
                <li>Providing customer support</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
              <p className="text-white/90 leading-relaxed mb-3">
                We use the following trusted third-party services to operate our app:
              </p>
              <div className="space-y-3 text-white/90">
                <div>
                  <h3 className="text-lg font-medium">Supabase</h3>
                  <p className="ml-4">Database hosting and authentication services. Your learning data is stored securely in our Supabase database.</p>
                </div>
                <div>
                  <h3 className="text-lg font-medium">RevenueCat</h3>
                  <p className="ml-4">Subscription management and payment processing. All payment transactions are handled through Apple App Store and Google Play Store. We do not store your credit card information.</p>
                </div>
                <div>
                  <h3 className="text-lg font-medium">Backblaze B2</h3>
                  <p className="ml-4">Audio file storage and delivery. Pre-generated pronunciation audio files are hosted on Backblaze B2.</p>
                </div>
                <div>
                  <h3 className="text-lg font-medium">Google OAuth / Apple Sign In</h3>
                  <p className="ml-4">Authentication services. We receive only the information you authorize (email, name, profile picture).</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Storage and Security</h2>
              <ul className="list-disc list-inside space-y-2 text-white/90 ml-4">
                <li>All data is transmitted using SSL/TLS encryption</li>
                <li>Passwords are never stored (OAuth-based authentication only)</li>
                <li>Database access is restricted and monitored</li>
                <li>Regular security audits and updates</li>
                <li>Compliance with industry-standard security practices</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Notifications</h2>
              <p className="text-white/90 leading-relaxed">
                Learning reminders and streak notifications are scheduled locally on your device. They are optional,
                can be turned on or off at any time in your settings, and require your permission. We do not use
                push notification tokens and do not send your notification data to our servers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
              <p className="text-white/90 leading-relaxed mb-3">
                You have the following rights regarding your personal data:
              </p>
              <ul className="list-disc list-inside space-y-2 text-white/90 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal data by emailing support@sprind.uk</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Delete your account and all associated data at any time via Account Settings → Delete Account</li>
                <li><strong>Portability:</strong> Export your learning data by contacting support@sprind.uk</li>
                <li><strong>Restriction:</strong> Learning progress data is required for core app functionality and cannot be disabled independently — deleting your account removes all data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
              <p className="text-white/90 leading-relaxed">
                We retain your personal data only as long as necessary to provide our services and comply with legal obligations. 
                When you delete your account, all your personal data is permanently removed from our systems within 30 days. 
                No analytics data is retained after account deletion.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Account Deletion</h2>
              <p className="text-white/90 leading-relaxed">
                You can delete your account at any time from the Account Settings page. Deleting your account will:
              </p>
              <ul className="list-disc list-inside space-y-2 text-white/90 ml-4 mt-3">
                <li>Permanently delete all your personal information</li>
                <li>Remove all learning progress and custom playlists</li>
                <li>Revoke all access to premium features</li>
              </ul>
              <p className="text-white/90 leading-relaxed mt-3">
                <strong>Important:</strong> Deleting your account does <strong>not</strong> automatically cancel an active App Store or Google Play subscription.
                You must cancel your subscription separately through your Apple ID settings (iOS) or Google Play account settings (Android) before or after deleting your account,
                otherwise you may continue to be billed.
              </p>
              <p className="text-white/90 leading-relaxed mt-3">
                <strong>This action cannot be undone.</strong> Please export your data before deleting if you wish to keep a copy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
              <p className="text-white/90 leading-relaxed">
                Our service is not directed to children under 13 years of age. We do not knowingly collect personal information 
                from children under 13. If you believe a child under 13 has provided us with personal information, please contact 
                us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">International Data Transfers</h2>
              <p className="text-white/90 leading-relaxed">
                Your data may be processed and stored in countries outside your residence. We ensure appropriate safeguards are 
                in place to protect your data in accordance with this Privacy Policy and applicable laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
              <p className="text-white/90 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting 
                the new policy in the app and updating the "Last updated" date. Your continued use of the app after such changes 
                constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <p className="text-white/90 leading-relaxed mb-3">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-white/90">
                <p><strong>Email:</strong> support@sprind.uk</p>
                <p><strong>Support:</strong> support@sprind.uk</p>
                <p className="mt-2 text-sm text-white/70">
                  We will respond to your inquiry within 48 hours.
                </p>
              </div>
            </section>

            <section className="pt-6 border-t border-white/20">
              <p className="text-white/60 text-sm">
                By using Sprind, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.
              </p>
            </section>
          </div>

          {/* Footer Navigation */}
          <div className="mt-6 flex justify-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/terms-of-service')}
              className="text-white hover:bg-white/10"
            >
              Terms of Service
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/support')}
              className="text-white hover:bg-white/10"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
