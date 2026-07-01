'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

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