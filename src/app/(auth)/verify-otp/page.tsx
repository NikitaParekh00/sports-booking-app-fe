"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

function VerifyOtpContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [loading, setLoading] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '']);
    const [phone, setPhone] = useState('');
    const [loginType, setLoginType] = useState('');

    useEffect(() => {
        const phoneParam = searchParams.get('phone');
        const typeParam = searchParams.get('type');
        if (phoneParam) setPhone(phoneParam);
        if (typeParam) setLoginType(typeParam);
    }, [searchParams]);


    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) return; // Only allow single digit

        const newOtp = [...otp];
        newOtp[index] = value.replace(/\D/g, ''); // Only allow digits
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 4) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        // Handle backspace
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 5);
        const newOtp = ['', '', '', '', ''];

        for (let i = 0; i < pastedData.length; i++) {
            newOtp[i] = pastedData[i];
        }

        setOtp(newOtp);

        // Focus the last filled input or the first empty one
        const lastFilledIndex = Math.min(pastedData.length - 1, 4);
        const nextInput = document.getElementById(`otp-${lastFilledIndex}`);
        nextInput?.focus();
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate OTP format
            const otpString = otp.join('');
            if (otpString.length !== 5) {
                alert('Please enter a valid 5-digit code.');
                return;
            }

            // Hardcoded OTP validation
            // For phone 7506256356, use code 98904
            // For all other phones, use code 654321 (first 5 digits: 65432)
            const phoneNumber = phone.replace(/\D/g, ''); // Remove all non-digits
            const expectedCode = phoneNumber.includes('7506256356') ? '98904' : '65432';

            if (otpString !== expectedCode) {
                alert('Invalid code. Please try again.');
                return;
            }

            // Find user in profiles table (standard format: +91-XXXXXXXXXX)
            const { data: existingUsers, error: checkError } = await supabase
                .from('profiles')
                .select('user_id, full_name, role')
                .eq('phone', phone);

            if (checkError) {
                console.error('Error checking existing user:', checkError);
                alert('Error verifying account. Please try again.');
                return;
            }

            const userData = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

            if (!userData) {
                alert('User not found. Please try signing up again.');
                return;
            }

            // Handle owner login separately
            if (loginType === 'owner-login') {
                // Check if user is an owner or admin
                if (userData.role !== 'owner' && userData.role !== 'admin') {
                    alert('Access denied. This dashboard is only for turf owners and admins.');
                    router.push('/owner/login');
                    return;
                }

                // Store owner session in localStorage (separate from app login)
                localStorage.setItem('sf:owner', JSON.stringify({
                    user_id: userData.user_id,
                    full_name: userData.full_name,
                    role: userData.role,
                    phone: phone
                }));

                // Success! Redirect to owner dashboard
                router.push('/owner');
                return;
            }

            // Regular app login
            // Store user data in localStorage for development
            localStorage.setItem('sf:user', JSON.stringify({
                user_id: userData.user_id,
                full_name: userData.full_name,
                email: ''
            }));

            // Success! Redirect to dashboard
            router.push('/dashboard');
        } catch (error) {
            console.error('Unexpected error:', error);
            alert('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };


    const formatPhoneNumber = (phone: string) => {
        // Format +91XXXXXXXXXX to +91 XXXXX XXXXX
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 12 && cleaned.startsWith('91')) {
            return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
        }
        return phone;
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
                    <h1 className="text-xl font-semibold text-gray-900">Verify Code</h1>
                </div>
            </div>

            {/* Content */}
            <div className="px-6 py-8">
                {/* Instructions */}
                <div className="text-center mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Enter unique code
                    </h2>
                    <p className="text-lg text-gray-700 font-medium">
                        {formatPhoneNumber(phone)}
                    </p>
                </div>

                {/* OTP Form */}
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                    {/* OTP Input Boxes */}
                    <div className="flex justify-center gap-3">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                id={`otp-${index}`}
                                type="text"
                                value={digit}
                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                className="w-12 h-12 border border-gray-200 rounded-xl text-center text-2xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                                maxLength={1}
                                required
                            />
                        ))}
                    </div>

                    {/* Verify Button */}
                    <button
                        type="submit"
                        disabled={loading || otp.join('').length !== 5}
                        className="w-full bg-red-600 text-white font-semibold py-4 px-6 rounded-xl text-base shadow-lg hover:bg-red-700 hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Verifying...' : 'VERIFY CODE'}
                    </button>
                </form>
            </div>

            {/* Home Indicator */}
            <div className="w-24 h-1 bg-gray-200 rounded-full mx-auto mb-6"></div>
        </div>
    );
}

export default function VerifyOtpPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        }>
            <VerifyOtpContent />
        </Suspense>
    );
}
