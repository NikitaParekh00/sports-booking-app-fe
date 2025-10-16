"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import PhoneInput from '@/components/PhoneInput';

export default function LoginPage() {
	const router = useRouter();
	const supabase = createClient();
	const [loading, setLoading] = useState(false);
	const [mobileNumber, setMobileNumber] = useState('');
	const [isPhoneValid, setIsPhoneValid] = useState(false);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			// Validate mobile number format
			if (!isPhoneValid) {
				alert('Please enter a valid 10-digit mobile number');
				return;
			}

			// Clean mobile number (remove any non-digits)
			const cleanMobileNumber = mobileNumber.replace(/\D/g, '');
			const formattedMobileNumber = `+91-${cleanMobileNumber}`; // Standard format: +91-XXXXXXXXXX

			// For development: Skip actual OTP sending and go directly to verification
			// In production, you would use: supabase.auth.signInWithOtp({ phone: formattedMobileNumber })

			// Check if user exists in profiles table
			const { data: existingUsers, error: checkError } = await supabase
				.from('profiles')
				.select('user_id, full_name')
				.eq('phone', formattedMobileNumber);

			if (checkError) {
				console.error('Error checking existing user:', checkError);
				alert('Error checking account. Please try again.');
				return;
			}

			const existingUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

			if (!existingUser) {
				alert('No account found with this mobile number. Redirecting to signup...');
				router.push('/signup');
				return;
			}

			// Redirect to OTP verification (with hardcoded OTP)
			router.push(`/verify-otp?phone=${encodeURIComponent(formattedMobileNumber)}&type=login`);
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
					<h1 className="text-xl font-semibold text-gray-900">Login</h1>
				</div>
			</div>

			{/* Form */}
			<form onSubmit={handleLogin} className="px-6 py-8 space-y-6">
				{/* Mobile Number */}
				<div>
					<PhoneInput
						value={mobileNumber}
						onChange={setMobileNumber}
						placeholder="9876543210"
						onValidationChange={setIsPhoneValid}
					/>
				</div>

				{/* Login Button */}
				<button
					type="submit"
					disabled={loading || !isPhoneValid}
					className="w-full bg-red-600 text-white font-semibold py-4 px-6 rounded-xl text-base shadow-lg hover:bg-red-700 hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Sending OTP...' : 'LOGIN'}
				</button>

				{/* Signup Link */}
				<div className="text-center">
					<span className="text-gray-700">Don&apos;t have an account? </span>
					<button
						type="button"
						onClick={() => router.push('/signup')}
						className="text-red-600 font-semibold hover:text-red-700 hover:underline"
					>
						Sign up
					</button>
				</div>
			</form>

			{/* Home Indicator */}
			<div className="w-24 h-1 bg-gray-200 rounded-full mx-auto mb-6"></div>
		</div>
	);
}