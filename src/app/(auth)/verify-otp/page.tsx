"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

const OTP_LEN = 5;

function VerifyOtpContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();
    const otpInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [otp, setOtp] = useState('');
    const [phone, setPhone] = useState('');
    const [loginType, setLoginType] = useState('');

    useEffect(() => {
        const phoneParam = searchParams.get('phone');
        const typeParam = searchParams.get('type');
        if (phoneParam) setPhone(phoneParam);
        if (typeParam) setLoginType(typeParam);
    }, [searchParams]);

    // One real input over the digit row keeps the mobile numeric keyboard open (no focus hopping).
    useEffect(() => {
        const t = window.setTimeout(() => otpInputRef.current?.focus(), 100);
        return () => window.clearTimeout(t);
    }, []);

    const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value.replace(/\D/g, '').slice(0, OTP_LEN);
        setOtp(next);
    };

    const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN);
        setOtp(pasted);
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate OTP format
            const otpString = otp;
            if (otpString.length !== OTP_LEN) {
                alert('Please enter a valid 5-digit code.');
                return;
            }

            // Hardcoded OTP validation
            // For phone 7506256356, use code 90123
            // For all other phones, use code 654321 (first 5 digits: 65432)
            const phoneNumber = phone.replace(/\D/g, ''); // Remove all non-digits
            const expectedCode = phoneNumber.includes('7506256356') ? '90123' : '65432';

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

            // Success! Land on return URL or homepage
            const returnTo = searchParams.get("returnTo");
            const safeReturn =
                returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : null;
            router.push(safeReturn ?? "/dashboard");
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
                    <div
                        className="relative mx-auto flex w-fit justify-center gap-3"
                        onPointerDown={() => otpInputRef.current?.focus()}
                    >
                        {Array.from({ length: OTP_LEN }, (_, index) => {
                            const activeIndex = Math.min(otp.length, OTP_LEN - 1);
                            const isActive = index === activeIndex;
                            return (
                            <div
                                key={index}
                                className={`pointer-events-none flex h-12 w-12 items-center justify-center rounded-xl border text-2xl font-bold text-gray-900 transition-colors duration-200 ${
                                    isActive
                                        ? 'border-red-500 ring-2 ring-red-500 ring-offset-0'
                                        : 'border-gray-200'
                                }`}
                                aria-hidden
                            >
                                {otp[index] ?? ''}
                            </div>
                            );
                        })}
                        <input
                            ref={otpInputRef}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            autoCorrect="off"
                            spellCheck={false}
                            name="otp"
                            value={otp}
                            onChange={handleOtpChange}
                            onPaste={handleOtpPaste}
                            className="absolute inset-0 z-10 w-full cursor-text opacity-0"
                            aria-label="Verification code"
                            maxLength={OTP_LEN}
                        />
                    </div>

                    {/* Verify Button */}
                    <button
                        type="submit"
                        disabled={loading || otp.length !== OTP_LEN}
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
