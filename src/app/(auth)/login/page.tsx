"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

export default function LoginPage() {
	const router = useRouter();
	const supabase = createClient();
	const [loading, setLoading] = useState(false);
	const [mobileNumber, setMobileNumber] = useState('');

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			// Validate mobile number format
			const mobileRegex = /^[6-9]\d{9}$/;
			if (!mobileRegex.test(mobileNumber.replace(/\D/g, ''))) {
				alert('Please enter a valid 10-digit mobile number');
				return;
			}

			// Clean mobile number (remove any non-digits)
			const cleanMobileNumber = mobileNumber.replace(/\D/g, '');
			const formattedMobileNumber = `+91${cleanMobileNumber}`;
			const formattedMobileNumberWithDash = `+91-${cleanMobileNumber}`;

			// For development: Skip actual OTP sending and go directly to verification
			// In production, you would use: supabase.auth.signInWithOtp({ phone: formattedMobileNumber })

			// Check if user exists in profiles table (try multiple formats)
			let { data: profileData, error: profileError } = await supabase
				.from('profiles')
				.select('user_id, full_name')
				.eq('phone', formattedMobileNumber)
				.single();

			// If not found, try with dash format
			if (profileError || !profileData) {
				const { data: profileDataDash, error: profileErrorDash } = await supabase
					.from('profiles')
					.select('user_id, full_name')
					.eq('phone', formattedMobileNumberWithDash)
					.single();

				profileData = profileDataDash;
				profileError = profileErrorDash;
			}

			// If still not found, try with just the clean number (no +91 prefix)
			if (profileError || !profileData) {
				const { data: profileDataClean, error: profileErrorClean } = await supabase
					.from('profiles')
					.select('user_id, full_name')
					.eq('phone', cleanMobileNumber)
					.single();

				profileData = profileDataClean;
				profileError = profileErrorClean;
			}

			if (profileError || !profileData) {
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
					<h1 className="text-lg font-bold text-black">Login</h1>
				</div>
			</div>

			{/* Form */}
			<form onSubmit={handleLogin} className="px-4 py-6 space-y-6">
				{/* Mobile Number */}
				<div>
					<input
						type="tel"
						value={mobileNumber}
						onChange={(e) => setMobileNumber(e.target.value)}
						placeholder="Mobile Number"
						className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
						required
					/>
				</div>

				{/* Login Button */}
				<button
					type="submit"
					disabled={loading}
					className="w-full bg-gradient-to-r from-teal-500 to-green-500 text-white font-bold py-4 px-6 rounded-lg text-lg hover:from-teal-600 hover:to-green-600 transition-all duration-200 disabled:opacity-50"
				>
					{loading ? 'Sending OTP...' : 'LOGIN'}
				</button>

				{/* Signup Link */}
				<div className="text-center">
					<span className="text-gray-700">Don&apos;t have an account? </span>
					<button
						type="button"
						onClick={() => router.push('/signup')}
						className="text-green-500 font-semibold hover:text-green-600"
					>
						Sign up
					</button>
				</div>
			</form>

			{/* Home Indicator */}
			<div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-black rounded-full"></div>
		</div>
	);
}