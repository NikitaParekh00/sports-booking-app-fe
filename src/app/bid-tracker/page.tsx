"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";

const DEFAULT_ROOM = "main";

function BidTrackerHomeInner() {
	const router = useRouter();
	const sp = useSearchParams();
	const initialRoom = useMemo(
		() => sp.get("room")?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || DEFAULT_ROOM,
		[sp],
	);
	const [room, setRoom] = useState(initialRoom);

	const go = useCallback(
		(path: "host" | "tap") => {
			const r = room.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || DEFAULT_ROOM;
			router.push(`/bid-tracker/${path}?room=${encodeURIComponent(r)}`);
		},
		[room, router],
	);

	return (
		<div className="min-h-[70vh] px-4 py-8 max-w-md mx-auto flex flex-col gap-6">
			<div>
				<p className="text-xs font-medium uppercase tracking-wide text-gray-500">
					Standalone tool
				</p>
				<h1 className="text-2xl font-bold text-gray-900 mt-1">Bid first timer</h1>
				<p className="text-sm text-gray-600 mt-2">
					Open the host screen on your device, share the same room code with bidders, and
					have them open the tap screen. Taps appear in the order they reach the host
					(works across phones on the same Supabase project).
				</p>
			</div>

			<div className="space-y-2">
				<label htmlFor="room" className="text-sm font-medium text-gray-800">
					Room code
				</label>
				<input
					id="room"
					value={room}
					onChange={(e) => setRoom(e.target.value)}
					placeholder={DEFAULT_ROOM}
					className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
					autoComplete="off"
				/>
				<p className="text-xs text-gray-500">Letters, numbers, dash, underscore only.</p>
			</div>

			<div className="flex flex-col gap-3">
				<button
					type="button"
					onClick={() => go("host")}
					className="w-full rounded-xl bg-gray-900 text-white font-semibold py-3.5 hover:bg-gray-800 transition-colors"
				>
					Open host screen
				</button>
				<button
					type="button"
					onClick={() => go("tap")}
					className="w-full rounded-xl bg-red-600 text-white font-semibold py-3.5 hover:bg-red-700 transition-colors"
				>
					Open tap screen (bidders)
				</button>
			</div>

			<p className="text-xs text-gray-500">
				Requires{" "}
				<code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
				<code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
				(Realtime enabled on your Supabase project).
			</p>

			<Link
				href="/dashboard"
				className="text-sm text-red-600 font-medium hover:underline self-start"
			>
				← Back to dashboard
			</Link>
		</div>
	);
}

export default function BidTrackerHomePage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-[40vh] flex items-center justify-center text-gray-500 text-sm">
					Loading…
				</div>
			}
		>
			<BidTrackerHomeInner />
		</Suspense>
	);
}
