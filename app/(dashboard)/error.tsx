'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="p-6 min-h-screen bg-[#0A0A0F] text-white">
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-gray-400 text-sm mb-4 break-words">
        {error.message}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-purple-600 px-4 py-2 rounded-lg text-sm hover:bg-purple-700"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="bg-[#1A1A24] px-4 py-2 rounded-lg text-sm hover:bg-[#2A2A3A] border border-[#2A2A3A]"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}