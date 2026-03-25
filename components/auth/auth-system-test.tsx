'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'

interface TestResult {
  name: string
  status: 'pending' | 'success' | 'error'
  message?: string
  details?: any
}

export function AuthSystemTest() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Environment Variables', status: 'pending' },
    { name: 'Supabase Connection', status: 'pending' },
    { name: 'Google Auth Setup', status: 'pending' },
    { name: 'Apple Auth Setup', status: 'pending' },
    { name: 'Database Schema', status: 'pending' }
  ])
  const [running, setRunning] = useState(false)

  const updateTest = (index: number, status: TestResult['status'], message?: string, details?: any) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, status, message, details } : test
    ))
  }

  const runTests = async () => {
    setRunning(true)
    
    // Test 1: Environment Variables
    updateTest(0, 'pending', 'Checking environment variables...')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const envVars = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      googleClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    }
    
    const envComplete = Object.values(envVars).every(Boolean)
    updateTest(0, envComplete ? 'success' : 'error', 
      envComplete ? 'All required environment variables found' : 'Missing environment variables',
      envVars
    )

    // Test 2: Supabase Connection
    updateTest(1, 'pending', 'Testing Supabase connection...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    try {
      const { createClient } = await import('@supabase/supabase-js')
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )
        
        const { data, error } = await supabase.from('user_profiles').select('id').limit(1)
        
        if (error && error.code === '42P01') {
          updateTest(1, 'error', 'Database table not found - run auth-schema.sql')
        } else if (error) {
          updateTest(1, 'error', `Database error: ${error.message}`)
        } else {
          updateTest(1, 'success', 'Supabase connection successful')
        }
      } else {
        updateTest(1, 'error', 'Supabase credentials not configured')
      }
    } catch (error) {
      updateTest(1, 'error', `Connection failed: ${error}`)
    }

    // Test 3: Google Auth Setup
    updateTest(2, 'pending', 'Checking Google Auth configuration...')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    try {
      const { SocialLogin } = await import('@capgo/capacitor-social-login')
      updateTest(2, 'success', 'Google Auth plugin loaded successfully')
    } catch (error) {
      updateTest(2, 'error', `Google Auth plugin error: ${error}`)
    }

    // Test 4: Apple Auth Setup
    updateTest(3, 'pending', 'Checking Apple Auth configuration...')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    try {
      const { SignInWithApple } = await import('@capacitor-community/apple-sign-in')
      updateTest(3, 'success', 'Apple Auth plugin loaded successfully')
    } catch (error) {
      updateTest(3, 'error', `Apple Auth plugin error: ${error}`)
    }

    // Test 5: Database Schema
    updateTest(4, 'pending', 'Verifying database schema...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )
        
        // Check if required tables exist
        const tables = ['user_profiles', 'subscription_history', 'stripe_subscriptions', 'apple_subscriptions']
        const results = []
        
        for (const table of tables) {
          try {
            const { error } = await supabase.from(table).select('id').limit(1)
            results.push({ table, exists: !error || error.code !== '42P01' })
          } catch {
            results.push({ table, exists: false })
          }
        }
        
        const allTablesExist = results.every(r => r.exists)
        updateTest(4, allTablesExist ? 'success' : 'error',
          allTablesExist ? 'All required tables found' : 'Some tables missing - run auth-schema.sql',
          results
        )
      } else {
        updateTest(4, 'error', 'Cannot verify schema - Supabase not configured')
      }
    } catch (error) {
      updateTest(4, 'error', `Schema check failed: ${error}`)
    }

    setRunning(false)
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      case 'pending':
        return <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
    }
  }

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Pass</Badge>
      case 'error':
        return <Badge variant="destructive">Fail</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          System Health Check
          <Button onClick={runTests} disabled={running}>
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              'Run Tests'
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tests.map((test, index) => (
          <div key={test.name} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              {getStatusIcon(test.status)}
              <div>
                <div className="font-medium">{test.name}</div>
                {test.message && (
                  <div className="text-sm text-gray-600">{test.message}</div>
                )}
                {test.details && (
                  <pre className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded overflow-auto">
                    {JSON.stringify(test.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
            {getStatusBadge(test.status)}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}