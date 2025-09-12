"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

export default function VerifyOtpPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [loading, setLoading] = useState(false);
    const [otp, setOtp] = useState('');
    const [phone, setPhone] = useState('');
    const [type, setType] = useState<'signup' | 'login'>('login');
    const [timeLeft, setTimeLeft] = useState(60);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        const phoneParam = searchParams.get('phone');
        const typeParam = searchParams.get('type') as 'signup' | 'login';

        if (phoneParam) setPhone(phoneParam);
        if (typeParam) setType(typeParam);
    }, [searchParams]);

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [timeLeft]);

    const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 5);
        setOtp(value);
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // For development: hardcoded OTP
            if (otp !== '11111') {
                alert('Invalid OTP. Please enter 11111 for testing.');
                return;
            }

            // For development: Skip actual OTP verification
            // In production, you would use: supabase.auth.verifyOtp({ phone, token: otp })

            // Find user in profiles table (try multiple phone formats)
            let { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('user_id, full_name')
                .eq('phone', phone)
                .single();

            // If not found, try with clean number (remove +91 prefix)
            if (userError || !userData) {
                const cleanPhone = phone.replace(/^\+91/, '').replace(/^\+91-/, '');
                const { data: userDataClean, error: userErrorClean } = await supabase
                    .from('profiles')
                    .select('user_id, full_name')
                    .eq('phone', cleanPhone)
                    .single();

                userData = userDataClean;
                userError = userErrorClean;
            }

            if (userError || !userData) {
                alert('User not found. Please try signing up again.');
                return;
            }

            // Store user data in localStorage for development
            localStorage.setItem('sf:user', JSON.stringify({
                user_id: userData.user_id,
                full_name: userData.full_name,
                email: userData.email || ''
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

    const handleResendOtp = async () => {
        setLoading(true);
        setCanResend(false);
        setTimeLeft(60);

        try {
            // For development: Skip actual OTP resending
            // In production, you would use: supabase.auth.signInWithOtp({ phone })
            alert('OTP resent successfully! Use 11111 for testing.');
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
                    <h1 className="text-lg font-bold text-black">Verify OTP</h1>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 py-6">
                {/* Instructions */}
                <div className="text-center mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Enter the OTP sent to
                    </h2>
                    <p className="text-lg text-gray-700 font-medium">
                        {formatPhoneNumber(phone)}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        For testing, use OTP: <span className="font-bold text-teal-600">11111</span>
                    </p>
                </div>

                {/* OTP Form */}
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                    {/* OTP Input */}
                    <div>
                        <input
                            type="text"
                            value={otp}
                            onChange={handleOtpChange}
                            placeholder="Enter 5-digit OTP"
                            className="w-full px-4 py-4 border border-gray-300 rounded-lg text-center text-2xl font-bold tracking-widest text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            maxLength={5}
                            required
                        />
                    </div>

                    {/* Verify Button */}
                    <button
                        type="submit"
                        disabled={loading || otp.length !== 5}
                        className="w-full bg-gradient-to-r from-teal-500 to-green-500 text-white font-bold py-4 px-6 rounded-lg text-lg hover:from-teal-600 hover:to-green-600 transition-all duration-200 disabled:opacity-50"
                    >
                        {loading ? 'Verifying...' : 'VERIFY OTP'}
                    </button>
                </form>

                {/* Resend OTP */}
                <div className="text-center mt-6">
                    {canResend ? (
                        <button
                            onClick={handleResendOtp}
                            disabled={loading}
                            className="text-teal-600 font-semibold hover:text-teal-700 disabled:opacity-50"
                        >
                            Resend OTP
                        </button>
                    ) : (
                        <p className="text-gray-500">
                            Resend OTP in {timeLeft}s
                        </p>
                    )}
                </div>

                {/* Help Text */}
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 text-center">
                        <strong>For Development:</strong> Use OTP <span className="font-bold text-teal-600">11111</span> to verify your account.
                    </p>
                </div>
            </div>

            {/* Home Indicator */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-black rounded-full"></div>
        </div>
    );
}
