"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

export default function SignupPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        mobileNumber: '',
        email: '',
        referralCode: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate required fields
            if (!formData.fullName.trim() || !formData.mobileNumber.trim()) {
                alert('Please fill in all required fields');
                return;
            }

            // Validate mobile number format (basic validation)
            const mobileRegex = /^[6-9]\d{9}$/;
            if (!mobileRegex.test(formData.mobileNumber.replace(/\D/g, ''))) {
                alert('Please enter a valid 10-digit mobile number');
                return;
            }

            // Clean mobile number (remove any non-digits)
            const cleanMobileNumber = formData.mobileNumber.replace(/\D/g, '');
            const formattedMobileNumber = `+91-${cleanMobileNumber}`; // Use dash format to match database

            // For development: Create user directly in profiles table
            // In production, you would use: supabase.auth.signUp({ phone: formattedMobileNumber })

            // Check if user already exists (try both formats)
            let { data: existingUser, error: checkError } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('phone', formattedMobileNumber)
                .single();

            // If not found, try without dash format
            if (checkError || !existingUser) {
                const { data: existingUserNoDash, error: checkErrorNoDash } = await supabase
                    .from('profiles')
                    .select('user_id')
                    .eq('phone', `+91${cleanMobileNumber}`)
                    .single();

                existingUser = existingUserNoDash;
                checkError = checkErrorNoDash;
            }

            if (existingUser) {
                alert('An account with this mobile number already exists. Please login instead.');
                return;
            }

            // Create a temporary user ID (in production, this would come from auth.signUp)
            const tempUserId = crypto.randomUUID();

            // Store user data in profiles table
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    user_id: tempUserId,
                    full_name: formData.fullName,
                    phone: formattedMobileNumber,
                    email: formData.email || null,
                    referral_code: formData.referralCode || null
                });

            if (profileError) {
                console.error('Profile creation error:', profileError);
                alert('Signup failed. Please try again.');
                return;
            }

            // Redirect to OTP verification
            router.push(`/verify-otp?phone=${encodeURIComponent(formattedMobileNumber)}&type=signup`);
        } catch (error) {
            console.error('Unexpected error:', error);
            alert('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">

            {/* Header */}
            <div className="bg-gray-100 px-4 py-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-200 rounded-full"
                    >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-bold text-black">Create an account</h1>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSignup} className="px-4 py-6 space-y-6">
                {/* Full Name */}
                <div>
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="Full Name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                    />
                </div>

                {/* Mobile Number */}
                <div>
                    <input
                        type="tel"
                        name="mobileNumber"
                        value={formData.mobileNumber}
                        onChange={handleInputChange}
                        placeholder="Mobile Number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                    />
                </div>

                {/* Email (Optional) */}
                <div>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Email (Optional)"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                </div>

                {/* Referral Code (Optional) */}
                <div>
                    <input
                        type="text"
                        name="referralCode"
                        value={formData.referralCode}
                        onChange={handleInputChange}
                        placeholder="Referral Code (Optional)"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                </div>


                {/* Signup Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 text-white font-bold py-4 px-6 rounded-lg text-lg hover:bg-red-700 transition-all duration-200 disabled:opacity-50"
                >
                    {loading ? 'Creating Account...' : 'SIGNUP'}
                </button>

                {/* Terms and Privacy */}
                <p className="text-center text-sm text-gray-600">
                    By signing up for Simplifit you agree with the{' '}
                    <a href="/terms" className="text-blue-600 hover:underline">Terms of Use</a>
                    {' '}and{' '}
                    <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
                </p>
            </form>

            {/* Home Indicator */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-black rounded-full"></div>
        </div>
    );
}
