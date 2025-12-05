"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import PhoneInput from '@/components/PhoneInput';

export default function OwnerLoginPage() {
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
			const formattedMobileNumber = `+91-${cleanMobileNumber}`;

			// Check if user exists in profiles table and is an owner
			const { data: existingUsers, error: checkError } = await supabase
				.from('profiles')
				.select('user_id, full_name, role')
				.eq('phone', formattedMobileNumber);

			if (checkError) {
				console.error('Error checking existing user:', checkError);
				alert('Error checking account. Please try again.');
				return;
			}

			const existingUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

			if (!existingUser) {
				alert('No account found with this mobile number. Only owners can access this dashboard.');
				return;
			}

			// Check if user is an owner or admin
			if (existingUser.role !== 'owner' && existingUser.role !== 'admin') {
				alert('Access denied. This dashboard is only for turf owners and admins.');
				return;
			}

			// Store owner session in localStorage (separate from app login)
			localStorage.setItem('sf:owner', JSON.stringify({
				user_id: existingUser.user_id,
				full_name: existingUser.full_name,
				role: existingUser.role,
				phone: formattedMobileNumber
			}));

			// Redirect to OTP verification (with hardcoded OTP for development)
			router.push(`/verify-otp?phone=${encodeURIComponent(formattedMobileNumber)}&type=owner-login`);
		} catch (error) {
			console.error('Unexpected error:', error);
			alert('An unexpected error occurred. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Owner Login</h1>
					<p className="text-gray-600">Access your turf owner dashboard</p>
				</div>

				{/* Form */}
				<form onSubmit={handleLogin} className="space-y-6">
					{/* Mobile Number */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Mobile Number
						</label>
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
						className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg text-base shadow-md hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? 'Verifying...' : 'Login to Dashboard'}
					</button>

					{/* Info Message */}
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<p className="text-sm text-blue-800">
							<strong>Note:</strong> Only turf owners and admins can access this dashboard. 
							If you don&apos;t have an owner account, please contact support.
						</p>
					</div>
				</form>
			</div>
		</div>
	);
}

