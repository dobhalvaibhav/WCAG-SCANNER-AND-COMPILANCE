'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#111118] border border-[#2A2A3A] rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            Reset Password
          </h1>
          <p className="text-gray-400 mb-6">
            Enter your email and we will send you a reset link.
          </p>

          {sent ? (
            <div className="bg-green-500/10 border border-green-500/20 
              rounded-lg p-4 text-green-400 text-center">
              ✅ Check your email for the reset link!
              <p className="text-gray-400 text-sm mt-2">
                Didnt receive it? Check spam folder.
              </p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 
                  rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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
                  disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <p className="text-center text-gray-400 text-sm mt-6">
            Remember your password?{' '}
            <Link href="/login" className="text-purple-400 hover:text-purple-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}