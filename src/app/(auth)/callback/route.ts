import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabaseClient";

export async function GET(_req: NextRequest) {
	// For email OTP/magic link, Supabase handles callback internally via deep link.
	// This endpoint is a placeholder for future OAuth providers.
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		return NextResponse.redirect(new URL("/", _req.url));
	}

	return NextResponse.redirect(new URL("/login", _req.url));
}

