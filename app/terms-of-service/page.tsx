'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TermsOfServicePage() {
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
            <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
          </div>

          {/* Content */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-white space-y-6">
            <div>
              <p className="text-white/80 text-sm">Last updated: January 24, 2026</p>
            </div>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
              <p className="text-white/90 leading-relaxed">
                By accessing or using Vocab World ("the App"), you agree to be bound by these Terms of Service ("Terms"). 
                If you do not agree to these Terms, please do not use the App. We reserve the right to modify these 
                Terms at any time, and your continued use constitutes acceptance of any changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Description of Service</h2>
              <p className="text-white/90 leading-relaxed mb-3">
                Vocab World is a language learning application that provides:
              </p>
              <ul className="list-disc list-inside space-y-2 text-white/90 ml-4">
                <li>Vocabulary learning across 50 languages</li>
                <li>Audio pronunciation for vocabulary words</li>
                <li>Progress tracking and statistics</li>
                <li>Custom playlists and practice modes (Premium)</li>
                <li>Access to 43 vocabulary topics (some require Premium subscription)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">User Accounts</h2>
              <div className="space-y-3 text-white/90">
                <p className="leading-relaxed">
                  To use certain features of the App, you must create an account using Google or Apple authentication. 
                  You are responsible for:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Maintaining the security of your account</li>
                  <li>All activities that occur under your account</li>
                  <li>Notifying us immediately of any unauthorized access</li>
                  <li>Providing accurate and current information</li>
                </ul>
                <p className="leading-relaxed mt-3">
                  You must be at least 13 years old to create an account. Users under 18 must have parental consent.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Subscription and Payment</h2>
              <div className="space-y-3 text-white/90">
                <div>
                  <h3 className="text-lg font-medium mb-2">Free Tier</h3>
                  <p>Access to 3 basic topics (Greetings, Numbers, Time) with full audio pronunciation.</p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Premium Subscription</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Access to all 43 vocabulary topics</li>
                    <li>Audio in all 50 supported languages</li>
                    <li>Custom playlists and word search</li>
                    <li>Advanced learning statistics</li>
                    <li>Ad-free experience</li>
                  </ul>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Payment Terms</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Subscriptions are billed monthly or annually</li>
                    <li>Payments are processed securely through Stripe</li>
                    <li>Subscriptions automatically renew unless canceled</li>
                    <li>Prices may change with 30 days notice</li>
                    <li>No refunds for partial subscription periods</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Cancellation and Refunds</h2>
              <div className="space-y-3 text-white/90">
                <p className="leading-relaxed">
                  You may cancel your Premium subscription at any time through your Apple ID or Google Play account settings. 
                  Cancellation will take effect at the end of your current billing period.
                </p>
                <p className="leading-relaxed">
                  Refunds are provided at our discretion and in accordance with Apple App Store and Google Play Store policies. 
                  Generally, refunds are not provided for:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Partial subscription periods</li>
                  <li>Unused portions of a subscription</li>
                  <li>Change of mind after purchase</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Acceptable Use</h2>
              <p className="text-white/90 leading-relaxed mb-3">
                You agree NOT to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-white/90 ml-4">
                <li>Reverse engineer, decompile, or disassemble the App</li>
                <li>Use automated scripts or bots to access the service</li>
                <li>Share your account credentials with others</li>
                <li>Attempt to circumvent payment or subscription systems</li>
                <li>Download, copy, or redistribute audio files</li>
                <li>Use the App for any illegal or unauthorized purpose</li>
                <li>Interfere with or disrupt the App's functionality</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Intellectual Property</h2>
              <p className="text-white/90 leading-relaxed">
                All content in the App, including but not limited to text, graphics, logos, audio files, and software, 
                is the property of Vocab World or its licensors and is protected by copyright, trademark, and other intellectual 
                property laws. You may not copy, modify, distribute, or create derivative works without explicit permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Content Accuracy</h2>
              <p className="text-white/90 leading-relaxed">
                While we strive to provide accurate vocabulary translations and pronunciations, we do not guarantee 
                100% accuracy. The App is designed as a learning tool and should be supplemented with other resources 
                for comprehensive language learning. We are not responsible for any errors in translations or pronunciations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
              <p className="text-white/90 leading-relaxed">
                The App integrates with third-party services including Google OAuth, Apple Sign In, Stripe for payments, 
                and Supabase for data storage. Your use of these services is subject to their respective terms and privacy 
                policies. We are not responsible for the practices or content of third-party services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Disclaimer of Warranties</h2>
              <p className="text-white/90 leading-relaxed">
                THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, 
                INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. 
                We do not warrant that the App will be uninterrupted, error-free, or secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
              <p className="text-white/90 leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, VOCAB WORLD SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
                CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR OTHER INTANGIBLE LOSSES, RESULTING 
                FROM YOUR USE OR INABILITY TO USE THE APP. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR 
                THE SERVICE IN THE LAST 12 MONTHS.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Indemnification</h2>
              <p className="text-white/90 leading-relaxed">
                You agree to indemnify and hold harmless Vocab World, its affiliates, and their respective officers, directors, 
                employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) 
                arising from your use of the App or violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Termination</h2>
              <p className="text-white/90 leading-relaxed">
                We reserve the right to suspend or terminate your account at any time for violating these Terms or for 
                any other reason at our sole discretion. Upon termination, your right to use the App will immediately cease, 
                and we may delete your account data. Sections of these Terms that by their nature should survive termination 
                will survive, including ownership provisions, warranty disclaimers, and limitations of liability.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Changes to the Service</h2>
              <p className="text-white/90 leading-relaxed">
                We reserve the right to modify, suspend, or discontinue any part of the App at any time without notice. 
                We may also change subscription prices with 30 days advance notice to existing subscribers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
              <p className="text-white/90 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], 
                without regard to its conflict of law provisions. Any disputes arising from these Terms or the App 
                shall be resolved in the courts of [Your Jurisdiction].
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
              <p className="text-white/90 leading-relaxed mb-3">
                If you have questions about these Terms, please contact us:
              </p>
              <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-white/90">
                <p><strong>Email:</strong> legal@vocoapp.com</p>
                <p><strong>Support:</strong> support@vocoapp.com</p>
              </div>
            </section>

            <section className="pt-6 border-t border-white/20">
              <p className="text-white/60 text-sm">
                By using Vocab World, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </section>
          </div>

          {/* Footer Navigation */}
          <div className="mt-6 flex justify-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/privacy-policy')}
              className="text-white hover:bg-white/10"
            >
              Privacy Policy
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
