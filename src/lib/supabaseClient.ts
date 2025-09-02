"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
	const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!rawUrl || !rawAnonKey) {
		throw new Error(
			"Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
		);
	}

	// Sanitize common copy/paste mistakes
	const supabaseUrl = rawUrl.trim().replace(/^@+/, "").replace(/\/+$/, "");
	const supabaseAnonKey = rawAnonKey.trim();

	// Basic URL validation to give a clearer error early
	try {
		new URL(supabaseUrl);
	} catch {
		throw new TypeError(
			`Invalid NEXT_PUBLIC_SUPABASE_URL: "${supabaseUrl}". Expected like https://xyzcompany.supabase.co`,
		);
	}

	return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

