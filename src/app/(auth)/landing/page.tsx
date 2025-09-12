"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleSignup = () => {
        router.push('/signup');
    };

    const handleLogin = () => {
        router.push('/login');
    };

    const handleContinueWithoutLogin = () => {
        router.push('/dashboard');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute top-20 left-10 w-32 h-32 bg-red-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-10 w-40 h-40 bg-black rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-red-500 rounded-full blur-3xl"></div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
                {/* App Title */}
                <div className="text-center mb-12">
                    <h1 className="text-6xl font-black text-gray-900 mb-4 tracking-tight">
                        SPORTS
                    </h1>
                    <div className="w-24 h-1 bg-red-600 mx-auto mb-6"></div>
                    <p className="text-xl text-gray-600 font-light">
                        Book courts, play games, score matches
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="w-full max-w-sm space-y-6">
                    {/* Signup Button */}
                    <button
                        onClick={handleSignup}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-5 px-8 rounded-2xl text-lg shadow-2xl hover:shadow-red-500/25 hover:from-red-700 hover:to-red-800 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                    >
                        {loading ? 'Creating Account...' : 'GET STARTED'}
                    </button>

                    {/* Login Link */}
                    <div className="text-center">
                        <button
                            onClick={handleLogin}
                            className="text-gray-700 font-medium hover:text-red-600 transition-colors duration-200 text-lg"
                        >
                            Already have an account? <span className="text-red-600 font-semibold">Sign In</span>
                        </button>
                    </div>

                    {/* Continue without login */}
                    <div className="text-center pt-4">
                        <button
                            onClick={handleContinueWithoutLogin}
                            className="text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200 border-b border-transparent hover:border-gray-300"
                        >
                            Continue as guest
                        </button>
                    </div>
                </div>

                {/* Features */}
                <div className="mt-16 grid grid-cols-3 gap-8 text-center">
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <span className="text-sm text-gray-600 font-medium">Find Courts</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <span className="text-sm text-gray-600 font-medium">Book Slots</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <span className="text-sm text-gray-600 font-medium">Track Scores</span>
                    </div>
                </div>
            </div>

            {/* Home Indicator */}
            <div className="w-32 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
        </div>
    );
}
