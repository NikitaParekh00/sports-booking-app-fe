"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function LoginPage() {
	const supabase = createClient();
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');

	async function handlePasswordLogin(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			const { data, error: err } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (err) {
				setError(err.message);
				return;
			}

			if (data.user) {
				// Check user role
				const { data: profile, error: profileError } = await supabase
					.from('profiles')
					.select('role')
					.eq('user_id', data.user.id)
					.single();

				if (profileError) {
					console.error('Profile error:', profileError);
					setError(`Profile not found. Please visit /admin to fix your profile. User ID: ${data.user.id}`);
					return;
				}

				console.log('User role:', profile?.role);
				
				if (profile?.role === 'owner') {
					router.push('/owner');
				} else {
					router.push('/dashboard');
				}
			}
		} catch (err) {
			setError('An unexpected error occurred');
		} finally {
			setLoading(false);
		}
	}

	async function handleSendOtp(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		const { error: err } = await supabase.auth.signInWithOtp({ email });
		if (err) {
			setError(err.message);
			return;
		}
		setSent(true);
	}

	return (
		<div className="min-h-dvh flex items-center justify-center p-6">
			<div className="w-full max-w-sm space-y-4">
				<h1 className="text-2xl font-semibold">Login</h1>
				
				{/* Login Method Toggle */}
				<div className="flex space-x-2">
					<button
						type="button"
						onClick={() => setLoginMethod('password')}
						className={`px-3 py-1 text-sm rounded ${
							loginMethod === 'password' 
								? 'bg-blue-600 text-white' 
								: 'bg-gray-200 text-gray-700'
						}`}
					>
						Password
					</button>
					<button
						type="button"
						onClick={() => setLoginMethod('otp')}
						className={`px-3 py-1 text-sm rounded ${
							loginMethod === 'otp' 
								? 'bg-blue-600 text-white' 
								: 'bg-gray-200 text-gray-700'
						}`}
					>
						Magic Link
					</button>
				</div>

				{loginMethod === 'password' ? (
					<form onSubmit={handlePasswordLogin} className="space-y-3">
						<input
							type="email"
							required
							placeholder="you@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full border rounded-md px-3 py-2"
						/>
						<input
							type="password"
							required
							placeholder="Password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full border rounded-md px-3 py-2"
						/>
						<button
							type="submit"
							disabled={loading}
							className="w-full bg-black text-white rounded-md px-3 py-2 disabled:opacity-50"
						>
							{loading ? 'Signing in...' : 'Sign in'}
						</button>
					</form>
				) : (
					<form onSubmit={handleSendOtp} className="space-y-3">
						<input
							type="email"
							required
							placeholder="you@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full border rounded-md px-3 py-2"
						/>
						<button
							type="submit"
							className="w-full bg-black text-white rounded-md px-3 py-2"
						>
							Send magic link
						</button>
					</form>
				)}

				{sent && (
					<p className="text-sm text-green-600">Check your email for the link.</p>
				)}
				{error && <p className="text-sm text-red-600">{error}</p>}

				{/* Test Credentials */}
				<div className="mt-6 p-4 bg-gray-50 rounded-md">
					<h3 className="text-sm font-medium text-gray-700 mb-2">Test Credentials:</h3>
					<div className="text-xs text-gray-600 space-y-1">
						<div><strong>Owner:</strong> nikita@example.com / password123</div>
						<div><strong>Customer:</strong> customer@example.com / password123</div>
					</div>
				</div>
			</div>
		</div>
	);
}

