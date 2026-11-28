"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import PhoneInput, { formatPhoneForDB } from '@/components/PhoneInput';
import { requiresAdminLoginCode } from '@/lib/adminLoginCode';
import { defaultPostLoginPath, resolvePostLoginReturn } from '@/lib/postLoginRedirect';

type LookupStatus = 'idle' | 'checking' | 'found' | 'new' | 'error';

type ExistingProfile = {
	user_id: string;
	full_name: string | null;
	email: string | null;
	role: string | null;
};

const PHONE_REGEX = /^[6-9]\d{9}$/;

function digitsFromParam(value: string | null): string {
	return (value ?? '').replace(/\D/g, '').slice(-10);
}

function LoginContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const returnTo = searchParams.get('returnTo');
	const initialPhone = digitsFromParam(searchParams.get('phone'));
	const [mobileNumber, setMobileNumber] = useState(initialPhone);
	const [isPhoneValid, setIsPhoneValid] = useState(PHONE_REGEX.test(initialPhone));
	const [lookup, setLookup] = useState<LookupStatus>('idle');
	const [profile, setProfile] = useState<ExistingProfile | null>(null);
	const [fullName, setFullName] = useState('');
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!isPhoneValid) {
			setLookup('idle');
			setProfile(null);
			return;
		}

		const formattedMobileNumber = formatPhoneForDB(mobileNumber);
		let cancelled = false;
		setLookup('checking');

		(async () => {
			const supabase = createClient();
			const { data, error } = await supabase
				.from('profiles')
				.select('user_id, full_name, email, role')
				.eq('phone', formattedMobileNumber);

			if (cancelled) return;

			if (error) {
				console.error('Error checking existing user:', error);
				setProfile(null);
				setLookup('error');
				return;
			}

			const existing = (data && data.length > 0 ? data[0] : null) as ExistingProfile | null;
			if (existing) {
				setProfile(existing);
				setFullName(existing.full_name ?? '');
				setLookup('found');
				return;
			}

			setProfile(null);
			setFullName('');
			setLookup('new');
		})();

		return () => {
			cancelled = true;
		};
	}, [isPhoneValid, mobileNumber]);

	const safeReturn = resolvePostLoginReturn(returnTo);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!isPhoneValid || lookup === 'checking' || lookup === 'idle') return;

		const formattedMobileNumber = formatPhoneForDB(mobileNumber);

		if (lookup === 'found' && profile) {
			if (requiresAdminLoginCode(formattedMobileNumber)) {
				const returnQs = safeReturn ? `&returnTo=${encodeURIComponent(safeReturn)}` : '';
				router.push(
					`/verify-otp?phone=${encodeURIComponent(formattedMobileNumber)}&type=login${returnQs}`
				);
				return;
			}

			localStorage.setItem('sf:user', JSON.stringify({
				user_id: profile.user_id,
				full_name: profile.full_name ?? '',
				email: profile.email ?? '',
				phone: formattedMobileNumber,
				role: profile.role ?? 'player',
			}));
			router.push(safeReturn ?? defaultPostLoginPath(profile.role, formattedMobileNumber));
			return;
		}

		if (lookup !== 'new') return;

		if (!fullName.trim()) {
			alert('Please enter your name');
			return;
		}

		setLoading(true);
		try {
			const supabase = createClient();
			const { data: existingUsers, error: checkError } = await supabase
				.from('profiles')
				.select('user_id, full_name, email, role')
				.eq('phone', formattedMobileNumber);

			if (checkError) {
				console.error('Error checking existing user:', checkError);
				alert('Error checking account. Please try again.');
				return;
			}

			const existing = (existingUsers && existingUsers.length > 0 ? existingUsers[0] : null) as ExistingProfile | null;
			if (existing) {
				setProfile(existing);
				setFullName(existing.full_name ?? '');
				setLookup('found');
				return;
			}

			const tempUserId = crypto.randomUUID();
			const { error: profileError } = await supabase
				.from('profiles')
				.insert({
					user_id: tempUserId,
					full_name: fullName.trim(),
					phone: formattedMobileNumber,
					email: null,
					role: 'player',
					points: 10,
					points_earned: 10,
				});

			if (profileError) {
				console.error('Profile creation error:', profileError);
				alert('Signup failed. Please try again.');
				return;
			}

			localStorage.setItem('sf:user', JSON.stringify({
				user_id: tempUserId,
				full_name: fullName.trim(),
				email: '',
				phone: formattedMobileNumber,
				role: 'player',
			}));
			router.push(safeReturn ?? defaultPostLoginPath('player', formattedMobileNumber));
		} catch (error) {
			console.error('Unexpected error:', error);
			alert('An unexpected error occurred. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const title = lookup === 'found' ? 'Login' : lookup === 'new' ? 'Create an account' : 'Continue';
	const buttonLabel = loading
		? 'Please wait…'
		: lookup === 'checking'
			? 'Checking…'
			: lookup === 'found'
				? 'LOGIN'
				: lookup === 'new'
					? 'SIGNUP'
					: 'CONTINUE';

	return (
		<div className="min-h-screen bg-white">
			<div className="bg-white px-4 py-4 border-b border-gray-100">
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => router.push('/landing')}
						className="p-2 hover:bg-gray-50 rounded-full transition-colors duration-200"
					>
						<svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
					</button>
					<h1 className="text-xl font-semibold text-gray-900">{title}</h1>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="px-6 py-8 space-y-6">
				<div>
					<PhoneInput
						value={mobileNumber}
						onChange={setMobileNumber}
						placeholder="9876543210"
						onValidationChange={setIsPhoneValid}
						className="px-4 py-4 rounded-xl text-gray-900"
					/>
				</div>

				{lookup === 'checking' && (
					<p className="text-sm text-gray-500">Checking this number…</p>
				)}
				{lookup === 'error' && (
					<p className="text-sm text-red-600">Could not check this number. Please try again.</p>
				)}

				{(lookup === 'found' || lookup === 'new') && (
					<div>
						<input
							type="text"
							name="fullName"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							placeholder="Full Name"
							readOnly={lookup === 'found'}
							className="w-full px-4 py-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 read-only:bg-gray-50"
							required
						/>
					</div>
				)}

				<button
					type="submit"
					disabled={!isPhoneValid || loading || lookup === 'idle' || lookup === 'checking' || lookup === 'error'}
					className="w-full bg-red-600 text-white font-semibold py-4 px-6 rounded-xl text-base shadow-lg hover:bg-red-700 hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{buttonLabel}
				</button>
			</form>

			<div className="w-24 h-1 bg-gray-200 rounded-full mx-auto mb-6"></div>
		</div>
	);
}

export default function LoginPage() {
	return (
		<Suspense fallback={
			<div className="min-h-screen bg-white flex items-center justify-center">
				<div className="text-gray-500">Loading...</div>
			</div>
		}>
			<LoginContent />
		</Suspense>
	);
}
