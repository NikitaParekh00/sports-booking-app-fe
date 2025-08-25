"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function LoginPage() {
	const supabase = createClient();
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);

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
				{sent && (
					<p className="text-sm text-green-600">Check your email for the link.</p>
				)}
				{error && <p className="text-sm text-red-600">{error}</p>}
			</div>
		</div>
	);
}

