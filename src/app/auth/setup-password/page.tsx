'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SetupPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Method 1: Verify OTP directly from query params (admin-shared invite link)
        // URL format: /auth/setup-password?email=xxx&token=xxx
        const searchParams = new URLSearchParams(window.location.search);
        const emailParam = searchParams.get('email');
        const tokenParam = searchParams.get('token');

        if (emailParam && tokenParam) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            email: emailParam,
            token: tokenParam,
            type: 'invite',
          });

          if (verifyError) {
            console.error('OTP verification error:', verifyError);
            setError('Failed to verify invitation. The link may have expired or already been used.');
            setInitializing(false);
            return;
          }

          // Clear query params from URL for cleaner display
          window.history.replaceState(null, '', window.location.pathname);
          setSessionReady(true);
          setInitializing(false);
          return;
        }

        // Method 2: Check for tokens in URL hash (from Supabase email redirect flow)
        const hash = window.location.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');

          if (accessToken && refreshToken && (type === 'invite' || type === 'recovery')) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('Session error:', sessionError);
              setError('Failed to verify invitation. The link may have expired.');
              setInitializing(false);
              return;
            }

            window.history.replaceState(null, '', window.location.pathname);
            setSessionReady(true);
            setInitializing(false);
            return;
          }

          // Check for error in hash (from failed Supabase redirect)
          const hashError = hashParams.get('error_description') || hashParams.get('error');
          if (hashError) {
            setError(decodeURIComponent(hashError));
            setInitializing(false);
            return;
          }
        }

        // Method 3: Check if user already has an active session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSessionReady(true);
        } else {
          setError('Auth session missing!');
        }
      } catch (err) {
        console.error('Error initializing session:', err);
        setError('Failed to initialize session');
      } finally {
        setInitializing(false);
      }
    };

    initializeSession();
  }, [supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);

      // Redirect to home page after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (err) {
      setError('Failed to set password');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while initializing session
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Set Successfully!</h2>
          <p className="text-gray-600">Redirecting you to the dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error if session is not ready
  if (!sessionReady && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invitation Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Please request a new invitation from your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Set Your Password</h1>
          <p className="text-gray-600 mt-2">Create a password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !sessionReady}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Setting Password...' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
