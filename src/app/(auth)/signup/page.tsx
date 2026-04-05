"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import PhoneInput from '@/components/PhoneInput';

export default function SignupPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [isPhoneValid, setIsPhoneValid] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        mobileNumber: '',
        email: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePhoneChange = (phone: string) => {
        setFormData(prev => ({
            ...prev,
            mobileNumber: phone
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

            // Validate mobile number format
            if (!isPhoneValid) {
                alert('Please enter a valid 10-digit mobile number');
                return;
            }

            // Clean mobile number (remove any non-digits)
            const cleanMobileNumber = formData.mobileNumber.replace(/\D/g, '');
            const formattedMobileNumber = `+91-${cleanMobileNumber}`; // Standard format: +91-XXXXXXXXXX

            // For development: Create user directly in profiles table
            // In production, you would use: supabase.auth.signUp({ phone: formattedMobileNumber })

            // Check if user already exists
            const { data: existingUsers, error: checkError } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('phone', formattedMobileNumber);

            if (checkError) {
                console.error('Error checking existing user:', checkError);
                alert('Error checking account. Please try again.');
                return;
            }

            const existingUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

            if (existingUser) {
                alert('An account with this mobile number already exists. Redirecting to login...');
                router.push('/login');
                return;
            }

            // For development: Create a temporary user ID
            const tempUserId = crypto.randomUUID();

            // Store user data in profiles table with points
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    user_id: tempUserId,
                    full_name: formData.fullName,
                    phone: formattedMobileNumber,
                    email: formData.email || null,
                    role: 'player',
                    points: 10, // Welcome bonus
                    points_earned: 10
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
            <div className="bg-white px-4 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-50 rounded-full transition-colors duration-200"
                    >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-semibold text-gray-900">Create an account</h1>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSignup} className="px-6 py-8 space-y-6">
                {/* Full Name */}
                <div>
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="Full Name"
                        className="w-full px-4 py-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                        required
                    />
                </div>

                {/* Mobile Number */}
                <div>
                    <PhoneInput
                        value={formData.mobileNumber}
                        onChange={handlePhoneChange}
                        placeholder="9876543210"
                        onValidationChange={setIsPhoneValid}
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
                        className="w-full px-4 py-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                    />
                </div>

                {/* Signup Button */}
                <button
                    type="submit"
                    disabled={loading || !isPhoneValid}
                    className="w-full bg-red-600 text-white font-semibold py-4 px-6 rounded-xl text-base shadow-lg hover:bg-red-700 hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Creating Account...' : 'SIGNUP'}
                </button>

                {/* Terms and Privacy */}
                {/* <p className="text-center text-sm text-gray-600 leading-relaxed">
                    By signing up for Simplifit you agree with the{' '}
                    <a href="/terms" className="text-red-600 hover:text-red-700 hover:underline font-medium">Terms of Use</a>
                    {' '}and{' '}
                    <a href="/privacy" className="text-red-600 hover:text-red-700 hover:underline font-medium">Privacy Policy</a>
                </p> */}
            </form>

            {/* Home Indicator */}
            <div className="w-24 h-1 bg-gray-200 rounded-full mx-auto mb-6"></div>
        </div>
    );
}
