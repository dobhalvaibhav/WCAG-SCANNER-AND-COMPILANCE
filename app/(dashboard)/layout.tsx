'use client'

import { useState, useEffect } from 'react'
import { Menu, ScanLine } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    document.title = 'Dashboard — WCAG Scanner'
  }, [])

  return (
    <div className="flex min-h-screen bg-[#0A0A0F]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-[#0A0A0F] border-r border-[#2A2A3A]
          transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#2A2A3A] bg-[#0A0A0F]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 text-gray-400 hover:text-white"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <ScanLine className="w-5 h-5 text-purple-500" />
          <span className="text-white font-semibold text-sm">WCAG Scanner</span>
          <div className="w-8" /> {/* spacer for centering */}
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}