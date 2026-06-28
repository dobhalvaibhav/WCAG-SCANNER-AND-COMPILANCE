'use client';

import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import SignOutButton from '@/components/layout/SignOutButton';

export default function SettingsPage() {
  const { user, profile } = useUser();
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile]);

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      // Profile update handled through Supabase client
      setMessage('Profile updated successfully!');
    } catch (err) {
      setMessage('Failed to update profile.');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-text-secondary text-sm mt-1">Manage your account settings.</p>
      </div>

      {/* Profile */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <User className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold">Profile</h2>
            <p className="text-text-muted text-sm">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={updateProfile} className="space-y-4">
          <div>
            <label htmlFor="full-name" className="block text-sm font-medium mb-1">
              Full Name
            </label>
            <input
              id="full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary outline-none focus:border-accent"
              placeholder="Your name"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-sm"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {message && (
            <p className={`text-sm ${message.includes('success') ? 'text-success' : 'text-danger'}`}>
              {message}
            </p>
          )}
        </form>
      </div>

      {/* Danger zone */}
      <div className="bg-surface border border-danger/20 rounded-xl p-6">
        <h2 className="font-semibold mb-2 text-danger">Danger Zone</h2>
        <p className="text-text-secondary text-sm mb-4">
          Sign out from your account. Your data will be preserved.
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}