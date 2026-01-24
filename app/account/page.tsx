'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  User, 
  Settings, 
  LogOut,
  ArrowLeft,
  Check,
  Shield,
  FileText,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AccountPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth')
  }

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE'
      })

      if (response.ok) {
        // Redirect to a goodbye page
        router.push('/')
      } else {
        const data = await response.json()
        alert(`Failed to delete account: ${data.error || 'Unknown error'}`)
        setIsDeleting(false)
        setShowDeleteConfirm(false)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('An error occurred. Please try again or contact support.')
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Account Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Card */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <User className="w-6 h-6" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-white/70">Email</label>
                <p className="text-lg font-medium">{user.email}</p>
              </div>
              <div>
                <label className="text-sm text-white/70">Name</label>
                <p className="text-lg font-medium">
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Features Card */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Settings className="w-6 h-6" />
                Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex items-center gap-2 text-green-400">
                  <Check className="w-4 h-4" />
                  <span>All 47 vocabulary topics</span>
                </div>
                <div className="flex items-center gap-2 text-green-400">
                  <Check className="w-4 h-4" />
                  <span>High-quality audio in 50 languages</span>
                </div>
                <div className="flex items-center gap-2 text-green-400">
                  <Check className="w-4 h-4" />
                  <span>Progress tracking & statistics</span>
                </div>
                <div className="flex items-center gap-2 text-green-400">
                  <Check className="w-4 h-4" />
                  <span>Custom playlists & practice modes</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardContent className="pt-6">
              <Button
                onClick={handleSignOut}
                variant="destructive"
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>

          {/* Legal & Privacy */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="w-6 h-6" />
                Legal & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="ghost"
                onClick={() => router.push('/privacy-policy')}
                className="w-full justify-start text-white hover:bg-white/10"
              >
                <FileText className="w-4 h-4 mr-2" />
                Privacy Policy
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push('/terms-of-service')}
                className="w-full justify-start text-white hover:bg-white/10"
              >
                <FileText className="w-4 h-4 mr-2" />
                Terms of Service
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push('/support')}
                className="w-full justify-start text-white hover:bg-white/10"
              >
                <FileText className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone - Delete Account */}
          <Card className="bg-red-900/20 backdrop-blur-md border-red-500/30 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="w-6 h-6" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-white/80 mb-4">
                  Deleting your account will permanently remove all your data, including:
                </p>
                <ul className="text-sm text-white/70 space-y-1 mb-4 ml-4 list-disc">
                  <li>Learning progress and statistics</li>
                  <li>Custom playlists and saved words</li>
                  <li>Subscription information</li>
                  <li>Account preferences</li>
                </ul>
                <p className="text-sm text-red-400 font-semibold">
                  This action cannot be undone.
                </p>
              </div>

              {showDeleteConfirm && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                  <p className="text-white font-medium mb-2">Are you absolutely sure?</p>
                  <p className="text-sm text-white/80 mb-4">
                    Type "DELETE" to confirm account deletion.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowDeleteConfirm(false)}
                      variant="ghost"
                      className="flex-1 text-white hover:bg-white/10"
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDeleteAccount}
                      variant="destructive"
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Confirm Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {!showDeleteConfirm && (
                <Button
                  onClick={handleDeleteAccount}
                  variant="destructive"
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete My Account
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
