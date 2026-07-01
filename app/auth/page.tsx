'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AuthFallbackPage() {
  const [status, setStatus] = useState('exchanging')
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const code = searchParams.get('code')
    const errorCode = searchParams.get('error_code')

    if (errorCode === 'otp_expired') {
      setStatus('expired')
      return
    }

    if (!code) {
      setStatus('no_code')
      return
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        console.error('Auth code exchange failed:', error.message)
        setStatus('expired')
      } else {
        router.replace('/reset-password')
      }
    })
  }, [searchParams, router])

  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#111118] border border-[#2A2A3A] rounded-2xl p-8 text-center">
          <p className="text-red-400 mb-4">This reset link has expired. Please request a new one.</p>
          <Link href="/forgot-password" className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium">
            Request New Link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111118] border border-[#2A2A3A] rounded-2xl p-8 text-center">
        <p className="text-gray-400">Verifying your link...</p>
      </div>
    </div>
  )
}