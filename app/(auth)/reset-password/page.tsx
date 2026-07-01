'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [exchanging, setExchanging] = useState(true) // exchanging code on mount
  const router = useRouter()
  const searchParams = useSearchParams()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Exchange the code from the email link on mount, if present
  useEffect(() => {
    const code = searchParams.get('code')
    const errorCode = searchParams.get('error_code')
    const errorDesc = searchParams.get('error_description')

    if (errorCode === 'otp_expired') {
      setError('This reset link has expired. Please request a new one.')
      setExchanging(false)
      return
    }

    if (!code) {
      // No code in URL — maybe session is already set (navigated here manually)
      setExchanging(false)
      return
    }

    // Exchange the code for a session
    supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      if (exchangeError) {
        console.error('Code exchange failed:', exchangeError.message)
        setError(exchangeError.message === 'Email link is invalid or has expired'
          ? 'This reset link has expired. Please request a new one.'
          : 'Failed to verify your reset link. Please request a new one.')
      }
      setExchanging(false)
    })
  }, [searchParams, supabase.auth])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError('Your reset link has expired. Please request a new one.')
        setLoading(false)
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password
      })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err: any) {
      console.error('Password update error:', err)
      setError('Something went wrong. Please try again or request a new link.')
    } finally {
      setLoading(false)
    }
  }

  if (exchanging) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[#111118] border border-[#2A2A3A] rounded-2xl p-8 text-center">
            <p className="text-gray-400">Verifying your reset link...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && error.includes('expired')) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[#111118] border border-[#2A2A3A] rounded-2xl p-8 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Link
              href="/forgot-password"
              className="inline-block bg-purple-600 hover:bg-purple-700 
                text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#111118] border border-[#2A2A3A] rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            Set New Password
          </h1>
          {done ? (
            <div className="bg-green-500/10 border border-green-500/20 
              rounded-lg p-4 text-green-400 text-center">
              ✅ Password updated! Redirecting to dashboard...
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4 mt-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 
                  rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  className="w-full bg-[#0A0A0F] border border-[#2A2A3A] 
                    rounded-lg px-4 py-3 text-white placeholder-gray-600
                    focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  className="w-full bg-[#0A0A0F] border border-[#2A2A3A] 
                    rounded-lg px-4 py-3 text-white placeholder-gray-600
                    focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 
                  text-white py-3 rounded-lg font-medium transition-colors
                  disabled:opacity-50">
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}