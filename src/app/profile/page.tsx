"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';

interface User {
    id: string;
    email?: string;
    full_name?: string;
    phone?: string;
}

export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function getUser() {
            try {
                // For development: Get user from localStorage
                const storedUser = localStorage.getItem('sf:user');

                if (storedUser) {
                    const userData = JSON.parse(storedUser);
                    setUser({
                        id: userData.user_id,
                        full_name: userData.full_name,
                        email: userData.email || '',
                        phone: userData.phone || ''
                    });
                } else {
                    // Fallback: Try to get from Supabase auth (for production)
                    const { data: { user }, error } = await supabase.auth.getUser();
                    if (error) throw error;
                    setUser(user);
                }
            } catch (error) {
                console.error('Error fetching user:', error);
            } finally {
                setLoading(false);
            }
        }

        getUser();
    }, [supabase]);

    const handleLogout = async () => {
        try {
            // For development: Clear localStorage
            localStorage.removeItem('sf:user');
            localStorage.removeItem('sf:selectedLocation');
            localStorage.removeItem('sf:selectedLocationObj');

            // For production: await supabase.auth.signOut();
            window.location.href = '/login';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-gray-500">Loading profile...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="px-4 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.history.back()}
                            className="p-2 hover:bg-gray-100 rounded-full"
                        >
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-lg font-semibold text-gray-900">Profile</h1>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-600 font-semibold text-sm">
                            {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* User Profile Info */}
                <div className="mt-6 flex items-center gap-4">
                    {/* Profile Picture */}
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-semibold text-xl">
                            {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                        </span>
                    </div>

                    {/* User Details */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-gray-900 font-semibold text-lg">
                                {user?.full_name || user?.email?.split('@')[0] || 'User'}
                            </span>
                            <button className="p-1">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600 text-sm">
                                {user?.phone || user?.email || 'No contact info'}
                            </span>
                            <button className="p-1">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 py-6 pb-32 max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Menu Items */}
                <div className="space-y-3">
                    {/* My Games */}
                    {/* <button onClick={() => alert('Coming Soon')} className="w-full flex items-center p-4 bg-white border border-gray-200 rounded-lg text-left">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <span className="flex-1 text-gray-900 font-medium">My Games</span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button> */}

                    {/* Past Booking */}
                    {/* <button onClick={() => alert('Coming Soon')} className="w-full flex items-center p-4 bg-white border border-gray-200 rounded-lg text-left">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        </div>
                        <span className="flex-1 text-gray-900 font-medium">Past Booking</span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button> */}

                    {/* Friends */}
                    {/* <button onClick={() => alert('Coming Soon')} className="w-full flex items-center p-4 bg-white border border-gray-200 rounded-lg text-left">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <span className="flex-1 text-gray-900 font-medium">Friends</span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button> */}

                    {/* My Transactions */}
                    {/* <button onClick={() => alert('Coming Soon')} className="w-full flex items-center p-4 bg-white border border-gray-200 rounded-lg text-left">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        </div>
                        <span className="flex-1 text-gray-900 font-medium">My Transactions</span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button> */}

                    {/* Refer & Earn */}
                    {/* <button onClick={() => alert('Coming Soon')} className="w-full flex items-center p-4 bg-white border border-gray-200 rounded-lg text-left">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        </div>
                        <span className="flex-1 text-gray-900 font-medium">Refer & Earn</span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button> */}

                    {/* Saved Payment Methods */}
                    {/* <button onClick={() => alert('Coming Soon')} className="w-full flex items-center p-4 bg-white border border-gray-200 rounded-lg text-left">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <span className="flex-1 text-gray-900 font-medium">Saved Payment Methods</span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button> */}

                    {/* Corporate Profile */}
                    {/* <button onClick={() => alert('Coming Soon')} className="w-full flex items-center p-4 bg-white border border-gray-200 rounded-lg text-left">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                            </svg>
                        </div>
                        <span className="flex-1 text-gray-900 font-medium">Corporate Profile</span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button> */}

                    {/* Contact Us */}
                    {/* <button onClick={() => alert('Coming Soon')} className="w-full flex items-center p-4 bg-white border border-gray-200 rounded-lg text-left">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <span className="flex-1 text-gray-900 font-medium">Contact Us</span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button> */}

                    {/* Logout */}
                    <button onClick={handleLogout} className="w-full flex items-center p-4 bg-white border border-gray-200 rounded-lg">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </div>
                        <span className="flex-1 text-gray-900 font-medium text-left">Logout</span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* Footer Links */}
                <div className="mt-8 text-center">
                    {/* <div className="space-y-2">
                        <a href="/terms" className="text-blue-600 text-sm underline block">Our Terms of Use</a>
                        <a href="/privacy" className="text-blue-600 text-sm underline block">Privacy Policy</a>
                    </div> */}
                    <div className="text-gray-500 text-xs mt-4">Version 1.0.0</div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-20">
                <div className="flex justify-around items-center">
                    <a href="/dashboard" className="flex flex-col items-center">
                        <svg className="w-6 h-6 text-gray-400 mb-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                        <span className="text-xs text-gray-400">Home</span>
                    </a>
                    <a href="/search" className="flex flex-col items-center">
                        <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="text-xs text-gray-400">Search</span>
                    </a>
                    <div className="flex flex-col items-center">
                        <svg className="w-6 h-6 text-red-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-xs text-red-600 font-medium">Profile</span>
                        <div className="w-6 h-0.5 bg-red-600 mt-1"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
