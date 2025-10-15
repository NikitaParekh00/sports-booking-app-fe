"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { fixUserProfile } from '@/lib/fixUserProfile';

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<'owner' | 'customer'>('owner');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Check authentication and admin role
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // For development: Get user from localStorage
        const storedUser = localStorage.getItem('sf:user');

        if (!storedUser) {
          alert('Please sign in to access admin panel.');
          router.push('/login');
          return;
        }

        const userData = JSON.parse(storedUser);

        // Check if user is an admin by looking up their profile in the database
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userData.user_id)
          .single();

        if (profileError || !profile) {
          alert('User profile not found. Please sign up again.');
          router.push('/login');
          return;
        }

        if (profile.role !== 'admin') {
          alert('Access denied. This page is for admins only.');
          router.push('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        alert('Error checking authentication. Please try again.');
        router.push('/login');
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, [router, supabase]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const handleFixProfile = async () => {
    if (!userId.trim()) {
      setResult('Please enter a user ID');
      return;
    }

    setLoading(true);
    setResult('');

    try {
      const response = await fixUserProfile(userId, role);
      setResult(response.success ? response.message! : `Error: ${response.error}`);
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFixCurrentUser = async () => {
    setLoading(true);
    setResult('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setResult('No authenticated user found. Please log in first.');
        return;
      }

      setUserId(user.id);
      const response = await fixUserProfile(user.id, role);
      setResult(response.success ? response.message! : `Error: ${response.error}`);
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin - Fix User Profiles</h1>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Fix User Profile Role</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter user ID or leave empty for current user"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'owner' | 'customer')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="owner">Owner</option>
                <option value="customer">Customer</option>
              </select>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleFixProfile}
                disabled={loading || !userId.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Fixing...' : 'Fix Profile'}
              </button>

              <button
                onClick={handleFixCurrentUser}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Fixing...' : 'Fix Current User'}
              </button>
            </div>

            {result && (
              <div className={`p-3 rounded-lg ${result.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                {result}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Instructions</h2>
          <div className="text-sm text-gray-600 space-y-2">
            <p>1. <strong>For Current User:</strong> Click &quot;Fix Current User&quot; to set the role for the currently logged-in user.</p>
            <p>2. <strong>For Specific User:</strong> Enter a user ID and click &quot;Fix Profile&quot;.</p>
            <p>3. <strong>After fixing:</strong> Log out and log back in to see the changes.</p>
            <p>4. <strong>Owner role:</strong> Will redirect to /owner dashboard</p>
            <p>5. <strong>Customer role:</strong> Will redirect to /dashboard</p>
          </div>
        </div>
      </div>
    </div>
  );
}