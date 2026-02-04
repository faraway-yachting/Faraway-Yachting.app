'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { User, Mail, Shield, Calendar, Building2, Save, Key, Check, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user, profile, isSuperAdmin, moduleRoles, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setMessage({ type: 'success', text: 'Profile updated successfully' });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setPasswordSaving(true);
    setPasswordMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordMessage({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (error: unknown) {
      console.error('Error changing password:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      setPasswordMessage({ type: 'error', text: errorMessage });
    } finally {
      setPasswordSaving(false);
    }
  };

  const roleDisplayName = isSuperAdmin
    ? 'Super Admin'
    : profile?.role
      ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
      : 'User';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header with avatar */}
        <div className="bg-gradient-to-r from-[#5A7A8F] to-[#4a6a7f] px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-semibold">
              {profile.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="text-white">
              <h2 className="text-xl font-semibold">{profile.full_name || 'No name set'}</h2>
              <p className="text-white/80">{user.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isSuperAdmin
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-white/20 text-white'
                }`}>
                  {roleDisplayName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile details */}
        <div className="p-6 space-y-6">
          {/* Message */}
          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {message.text}
            </div>
          )}

          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                    placeholder="Enter your name"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-900">
                    <User className="h-4 w-4 text-gray-400" />
                    {profile.full_name || <span className="text-gray-400 italic">Not set</span>}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {user.email}
                </div>
              </div>
            </div>
          </div>

          {/* Edit buttons */}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFullName(profile.full_name || '');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm font-medium text-[#5A7A8F] bg-[#5A7A8F]/10 rounded-lg hover:bg-[#5A7A8F]/20 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          <hr className="border-gray-200" />

          {/* Account Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  <Shield className="h-4 w-4 text-gray-400" />
                  {roleDisplayName}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Member Since</label>
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {formatDate(profile.created_at)}
                </div>
              </div>
            </div>
          </div>

          {/* Module Access */}
          {moduleRoles.length > 0 && (
            <>
              <hr className="border-gray-200" />
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Module Access</h3>
                <div className="flex flex-wrap gap-2">
                  {isSuperAdmin ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      <Building2 className="h-3 w-3" />
                      All Modules (Super Admin)
                    </span>
                  ) : (
                    moduleRoles.map((mr) => (
                      <span
                        key={mr.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                      >
                        <Building2 className="h-3 w-3" />
                        {mr.module.charAt(0).toUpperCase() + mr.module.slice(1)} - {mr.role}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Security Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Key className="h-4 w-4" />
            Security
          </h3>

          {passwordMessage && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm mb-4 ${
              passwordMessage.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {passwordMessage.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {passwordMessage.text}
            </div>
          )}

          {showPasswordForm ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  placeholder="Confirm new password"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleChangePassword}
                  disabled={passwordSaving || !newPassword || !confirmPassword}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors disabled:opacity-50"
                >
                  {passwordSaving ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordMessage(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="px-4 py-2 text-sm font-medium text-[#5A7A8F] bg-[#5A7A8F]/10 rounded-lg hover:bg-[#5A7A8F]/20 transition-colors"
            >
              Change Password
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
