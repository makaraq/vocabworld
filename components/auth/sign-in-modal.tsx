'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { Chrome } from 'lucide-react'

interface SignInModalProps {
  isOpen: boolean
  onCloseAction: () => void
}

export function SignInModal({ isOpen, onCloseAction }: SignInModalProps) {
  const { signInWithGoogle, loading } = useAuth()
  
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
      onCloseAction() // Close modal on successful sign in
    } catch (error) {
      console.error('Sign in failed:', error)
      // You could add a toast notification here
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onCloseAction}>
      <DialogContent className="sm:max-w-md border-0 bg-black/50 backdrop-blur-md">
        <div className="flex flex-col items-center justify-center p-8 text-center">
          {/* Welcome Text */}
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-wide">
            WELCOME TO VOCABWORLD!
          </h1>
          
          <p className="text-white/80 mb-8 text-sm">
            Sign into your account
          </p>
          
          {/* Google Sign In Button */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3"
          >
            <Chrome className="w-5 h-5" />
            {loading ? 'Signing in...' : 'Continue with Google'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}