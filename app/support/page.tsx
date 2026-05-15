'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, MessageCircle, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SupportPage() {
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
        <div className="max-w-2xl mx-auto p-6">
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
            <h1 className="text-3xl font-bold text-white">Support & Contact</h1>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Email Support Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Mail className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">Email Support</h2>
                  <p className="text-white/80 mb-4">
                    Get help with technical issues, account problems, or general inquiries.
                  </p>
                  <a 
                    href="mailto:support@vocoapp.com"
                    className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium transition-colors"
                  >
                    support@vocoapp.com
                  </a>
                  <p className="text-sm text-white/60 mt-3">
                    We typically respond within 24-48 hours
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <MessageCircle className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">Frequently Asked Questions</h2>
                  <div className="space-y-4 mt-4">
                    <div>
                      <h3 className="font-medium mb-1">How do I cancel my subscription?</h3>
                      <p className="text-sm text-white/80">
                        You can cancel your subscription through your Apple ID or Google Play account settings. 
                        Cancellation takes effect at the end of your current billing period.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Can I use Sprind offline?</h3>
                      <p className="text-sm text-white/80">
                        Some features require an internet connection, especially audio playback. We're working 
                        on offline support for future updates.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">How do I delete my account?</h3>
                      <p className="text-sm text-white/80">
                        Go to Account Settings and scroll down to find the "Delete Account" button. This action 
                        is permanent and cannot be undone.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">What languages are supported?</h3>
                      <p className="text-sm text-white/80">
                        Sprind supports 50 languages including major European, Asian, and global languages. 
                        Check the language selector for the complete list.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Legal Documents */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <FileText className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-4">Legal & Privacy</h2>
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      onClick={() => router.push('/privacy-policy')}
                      className="w-full justify-start text-left text-white hover:bg-white/10"
                    >
                      Privacy Policy
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => router.push('/terms-of-service')}
                      className="w-full justify-start text-left text-white hover:bg-white/10"
                    >
                      Terms of Service
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Contact Info */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white">
              <h2 className="text-xl font-semibold mb-4">Other Inquiries</h2>
              <div className="space-y-3 text-sm text-white/90">
                <p>
                  <strong>Privacy concerns:</strong> privacy@vocoapp.com
                </p>
                <p>
                  <strong>Business inquiries:</strong> business@vocoapp.com
                </p>
                <p>
                  <strong>Press & media:</strong> press@vocoapp.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
