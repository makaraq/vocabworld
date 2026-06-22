"use client"

import { useEffect, useState, type FormEvent } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/browser-client'
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

type Status = 'checking' | 'ready' | 'invalid' | 'done'

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // The recovery link lands here with a token in the URL. The Supabase client
  // (detectSessionInUrl: true) consumes it and emits PASSWORD_RECOVERY, which
  // gives us a short-lived session that authorizes updateUser({ password }).
  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setStatus('ready')
      }
    })

    // Fallback: the session may already be set before the listener attaches.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setStatus((prev) => (prev === 'ready' ? prev : session ? 'ready' : 'invalid'))
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setSubmitting(false)
      return
    }

    // Sign out the recovery session so they re-authenticate in the app with the
    // new password.
    await supabase.auth.signOut()
    setStatus('done')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md mx-auto">
        {status === 'checking' && (
          <CardContent className="text-center py-12">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto" />
            <p className="mt-4 text-gray-600 font-medium">Verifying your reset link…</p>
          </CardContent>
        )}

        {status === 'invalid' && (
          <>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-red-600">Link expired or invalid</CardTitle>
              <CardDescription>
                This password reset link is no longer valid. Open the Sprind app and tap
                “Forgot password?” again to get a fresh one.
              </CardDescription>
            </CardHeader>
          </>
        )}

        {status === 'ready' && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Set a new password</CardTitle>
              <CardDescription>Enter a new password for your Sprind account.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Updating…' : 'Update password'}
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {status === 'done' && (
          <>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-600">Password updated</CardTitle>
              <CardDescription>
                You can now return to the Sprind app and sign in with your new password.
              </CardDescription>
            </CardHeader>
          </>
        )}
      </Card>
    </div>
  )
}
