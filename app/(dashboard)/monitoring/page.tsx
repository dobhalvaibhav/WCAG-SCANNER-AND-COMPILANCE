'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, RefreshCw, AlertTriangle } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import Link from 'next/link'

interface MonitoredSite {
  id: string
  url: string
  label: string | null
  scan_frequency: string
  last_scanned_at: string | null
  last_scan_id: string | null
  is_active: boolean
  created_at: string
  last_scan?: {
    compliance_score: number
    total_violations: number
    status: string
  } | null
}

export default function MonitoringPage() {
  const { limits, isPaid } = useSubscription()
  const [sites, setSites] = useState<MonitoredSite[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    url: '',
    scan_frequency: 'weekly',
  })

  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch('/api/monitoring')
      if (res.ok) {
        const data = await res.json()
        setSites(data.sites || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSites()
  }, [fetchSites])

  const addSite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.url.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.url.trim(), frequency: formData.scan_frequency }),
      })
      if (res.ok) {
        setShowForm(false)
        setFormData({ url: '', scan_frequency: 'weekly' })
        fetchSites()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to add site')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const removeSite = async (id: string) => {
    if (!confirm('Remove this site from monitoring?')) return
    try {
      const res = await fetch('/api/monitoring', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) fetchSites()
    } catch (err) {
      console.error(err)
    }
  }

  const toggleSite = async (site: MonitoredSite) => {
    try {
      const res = await fetch('/api/monitoring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: site.id, is_active: !site.is_active }),
      })
      if (res.ok) fetchSites()
    } catch (err) {
      console.error(err)
    }
  }

  const getSiteCount = () => sites.length
  const maxSites = limits?.monitoredSites || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Site Monitoring</h1>
          <p className="text-gray-400 text-sm mt-1">
            Set up automatic re-scans on a schedule.
          </p>
        </div>
        {isPaid && getSiteCount() < maxSites && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Site
          </button>
        )}
      </div>

      {!isPaid && (
        <div className="bg-[#111118] border border-[#2A2A3A] rounded-xl p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-2">Pro Feature</h3>
          <p className="text-gray-400 text-sm mb-4">
            Site monitoring is available on Pro and Agency plans.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
          >
            Upgrade to Pro
          </Link>
        </div>
      )}

      {/* Usage bar */}
      {isPaid && (
        <div className="bg-[#111118] border border-[#2A2A3A] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Monitored Sites</span>
            <span className="text-sm text-white font-medium">{getSiteCount()} / {maxSites}</span>
          </div>
          <div className="w-full bg-[#0A0A0F] rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${(getSiteCount() / maxSites) * 100}%` }}
            />
          </div>
        </div>
      )}

      {showForm && isPaid && (
        <form onSubmit={addSite} className="bg-[#111118] border border-[#2A2A3A] rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">URL to Monitor</label>
            <input
              type="text"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://example.com"
              required
              className="w-full px-3 py-2 bg-[#0A0A0F] border border-[#2A2A3A] rounded-lg text-white placeholder-gray-500 outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Scan Frequency</label>
            <select
              value={formData.scan_frequency}
              onChange={(e) => setFormData({ ...formData, scan_frequency: e.target.value })}
              className="w-full px-3 py-2 bg-[#0A0A0F] border border-[#2A2A3A] rounded-lg text-white outline-none focus:border-purple-500"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm disabled:opacity-50">
              {saving ? 'Adding...' : 'Start Monitoring'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-[#2A2A3A] text-gray-400 rounded-lg text-sm hover:text-white">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : sites.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A3A]">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">URL</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Frequency</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Last Score</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Last Scanned</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => {
                  const score = site.last_scan?.compliance_score ?? null
                  const scoreColor = score !== null
                    ? score >= 90 ? '#22D3A0'
                      : score >= 75 ? '#22c55e'
                      : score >= 50 ? '#F59E0B'
                      : '#EF4444'
                    : '#6B7280'

                  return (
                    <tr key={site.id} className="border-b border-[#2A2A3A] hover:bg-[#111118]/50">
                      <td className="py-3 px-4">
                        <p className="text-white font-medium truncate max-w-[250px]">
                          {site.label || site.url}
                        </p>
                        {site.label && (
                          <p className="text-gray-500 text-xs truncate max-w-[250px]">{site.url}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-300 capitalize">{site.scan_frequency}</td>
                      <td className="py-3 px-4">
                        {score !== null ? (
                          <span className="font-bold" style={{ color: scoreColor }}>{score}/100</span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {site.last_scanned_at
                          ? new Date(site.last_scanned_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric'
                            })
                          : 'Never'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          site.is_active
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {site.is_active ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleSite(site)}
                            className="p-2 text-gray-400 hover:text-white transition-colors"
                            title={site.is_active ? 'Pause monitoring' : 'Resume monitoring'}
                          >
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium cursor-pointer ${site.is_active ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
                              {site.is_active ? 'ON' : 'OFF'}
                            </span>
                          </button>
                          <button
                            onClick={() => removeSite(site.id)}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                            title="Remove site"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-[#111118] border border-[#2A2A3A] rounded-xl p-8 text-center">
            <RefreshCw className="w-10 h-10 text-gray-500 mx-auto mb-3" />
            <h3 className="font-semibold text-white mb-1">No sites monitored</h3>
            <p className="text-gray-400 text-sm">
              {isPaid
                ? 'Add sites to monitor and get automatic re-scans.'
                : 'Upgrade to Pro to start monitoring sites.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}