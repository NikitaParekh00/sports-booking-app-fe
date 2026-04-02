"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
	openBidTrackerChannel,
	sendBidTap,
} from "@/lib/bidTrackerRealtime";
import type { RealtimeChannel } from "@supabase/supabase-js";

const NAME_KEY = "sf:bid_tracker_display_name";

function BidTrackerTapInner() {
	const searchParams = useSearchParams();
	const room = useMemo(
		() =>
			searchParams.get("room")?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "main",
		[searchParams],
	);

	const [name, setName] = useState("");
	const [status, setStatus] = useState<string>("Connecting…");
	const [sending, setSending] = useState(false);
	const [lastOk, setLastOk] = useState<string | null>(null);
	const channelRef = useRef<RealtimeChannel | null>(null);

	useEffect(() => {
		try {
			const saved = window.localStorage.getItem(NAME_KEY);
			if (saved) setName(saved);
		} catch {
			// ignore
		}
	}, []);

	useEffect(() => {
		let supabase: ReturnType<typeof createClient>;
		try {
			supabase = createClient();
		} catch {
			setStatus("Missing Supabase env");
			return;
		}

		const ch = openBidTrackerChannel(supabase, room);
		channelRef.current = ch;

		ch.subscribe((s, err) => {
			if (s === "SUBSCRIBED") setStatus("Ready — tap when bidding opens");
			else if (s === "CHANNEL_ERROR")
				setStatus(err?.message || "Channel error");
			else if (s === "TIMED_OUT") setStatus("Timed out");
			else if (s === "CLOSED") setStatus("Disconnected");
			else setStatus(s);
		});

		return () => {
			channelRef.current = null;
			supabase.removeChannel(ch);
		};
	}, [room]);

	const onTap = useCallback(async () => {
		const ch = channelRef.current;
		if (!ch || sending) return;
		const trimmed = name.trim() || "Anonymous";
		try {
			window.localStorage.setItem(NAME_KEY, trimmed);
		} catch {
			// ignore
		}

		setSending(true);
		const res = await sendBidTap(ch, trimmed);
		setSending(false);
		if (res.ok) {
			setLastOk(new Date().toISOString());
		} else {
			setStatus(res.error || "Send failed");
		}
	}, [name, sending]);

	const ready = status.includes("Ready");

	return (
		<div className="min-h-[70vh] px-4 py-6 max-w-md mx-auto flex flex-col gap-5">
			<div>
				<p className="text-xs text-gray-500">Tap screen · room</p>
				<p className="text-lg font-bold font-mono">{room}</p>
				<p className="text-xs mt-1 text-gray-600">{status}</p>
			</div>

			<div className="space-y-2">
				<label htmlFor="bid-name" className="text-sm font-medium text-gray-800">
					Your name (shown on host)
				</label>
				<input
					id="bid-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="e.g. Team A"
					className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
					autoComplete="name"
				/>
			</div>

			<button
				type="button"
				disabled={!ready || sending}
				onClick={onTap}
				className="w-full rounded-2xl bg-red-600 text-white text-xl font-bold py-16 shadow-lg disabled:opacity-40 disabled:shadow-none active:scale-[0.99] transition-transform"
			>
				{sending ? "Sending…" : "TAP"}
			</button>

			{lastOk && (
				<p className="text-xs text-center text-gray-500 font-mono">
					Last sent: {lastOk}
				</p>
			)}

			<Link
				href={`/bid-tracker?room=${encodeURIComponent(room)}`}
				className="text-sm text-red-600 font-medium hover:underline"
			>
				← Room setup
			</Link>
		</div>
	);
}

export default function BidTrackerTapPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-[40vh] flex items-center justify-center text-gray-500 text-sm">
					Loading tap screen…
				</div>
			}
		>
			<BidTrackerTapInner />
		</Suspense>
	);
}
