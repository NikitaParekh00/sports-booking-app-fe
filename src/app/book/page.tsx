"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type AuthUser = { email?: string | null } | null;

const SPORTS = [
	"Football",
	"Cricket",
	"Badminton",
	"Tennis",
	"Table Tennis",
	"Basketball",
	"Volleyball",
	"Futsal",
	"Swimming",
];

export default function BookingLandingPage() {
	const supabase = createClient();
	const [user, setUser] = useState<AuthUser>(null);

	useEffect(() => {
		(async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			setUser(user);
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const greetingName = user?.email ?? "Guest";

	return (
		<div className="space-y-8">
			{/* Logo placeholder */}
			<div className="h-12 w-40 bg-gray-100 border rounded-md flex items-center justify-center">
				<span className="text-sm text-gray-500">Logo</span>
			</div>

			<h1 className="text-2xl font-semibold">Hi {greetingName}</h1>
			<p className="text-gray-600">What sport are you looking to book?</p>

			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
				{SPORTS.map((sport) => (
					<a
						key={sport}
						href={`/search?sport=${encodeURIComponent(sport.toLowerCase())}`}
						className="border rounded-md p-4 hover:bg-gray-50 transition"
					>
						<div className="font-medium">{sport}</div>
						<div className="text-xs text-gray-500">Find {sport} courts</div>
					</a>
				))}
			</div>
		</div>
	);
}

