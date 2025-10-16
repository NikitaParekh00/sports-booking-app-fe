"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LandingPage() {
    const router = useRouter();
    const [loading] = useState(false);

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
        <div className="min-h-screen bg-white flex flex-col relative">
            {/* Subtle Background Pattern */}
            <div className="absolute inset-0 opacity-[0.02]">
                <div className="absolute top-20 left-10 w-32 h-32 bg-red-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-10 w-40 h-40 bg-gray-900 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-red-500 rounded-full blur-3xl"></div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
                {/* App Logo */}
                <div className="text-center mb-16">
                    <div className="mb-8">
                        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 max-w-fit mx-auto">
                            <Image
                                src="/logo.jpeg"
                                alt="Sports App Logo"
                                width={200}
                                height={80}
                                className="mx-auto"
                                priority
                            />
                        </div>
                    </div>
                    <div className="w-16 h-0.5 bg-red-600 mx-auto mb-8"></div>
                    <p className="text-lg text-gray-600 font-normal leading-relaxed max-w-sm mx-auto">
                        Book courts, play games, score matches
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="w-full max-w-xs space-y-6">
                    {/* Primary CTA Button */}
                    <button
                        onClick={handleSignup}
                        disabled={loading}
                        className="w-full bg-red-600 text-white font-semibold py-4 px-6 rounded-xl text-base shadow-lg hover:bg-red-700 hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating Account...' : 'GET STARTED'}
                    </button>

                    {/* Login Link */}
                    <div className="text-center">
                        <button
                            onClick={handleLogin}
                            className="text-gray-700 font-medium hover:text-red-600 transition-colors duration-200 text-base"
                        >
                            Already have an account? <span className="text-red-600 font-semibold">Sign In</span>
                        </button>
                    </div>

                    {/* Continue without login */}
                    <div className="text-center pt-2">
                        <button
                            onClick={handleContinueWithoutLogin}
                            className="text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
                        >
                            Continue as guest
                        </button>
                    </div>
                </div>

                {/* Features Section */}
                <div className="mt-20 w-full max-w-sm">
                    <div className="grid grid-cols-3 gap-6 text-center">
                        <div className="flex flex-col items-center">
                            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-3 border border-red-100">
                                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <span className="text-sm text-gray-700 font-medium">Find Courts</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-3 border border-red-100">
                                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span className="text-sm text-gray-700 font-medium">Book Slots</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-3 border border-red-100">
                                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <span className="text-sm text-gray-700 font-medium">Track Scores</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Home Indicator */}
            <div className="w-24 h-1 bg-gray-200 rounded-full mx-auto mb-6"></div>
        </div>
    );
}
