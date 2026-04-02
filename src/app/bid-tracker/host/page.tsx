"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
	subscribeBidTrackerChannel,
	type BidTapPayload,
} from "@/lib/bidTrackerRealtime";

type Row = BidTapPayload & { order: number; hostReceivedLabel: string };

function formatClock(d: Date): string {
	return d.toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: true,
	});
}

function formatMs(d: Date): string {
	const ms = d.getMilliseconds().toString().padStart(3, "0");
	return `${formatClock(d)}.${ms}`;
}

function BidTrackerHostInner() {
	const searchParams = useSearchParams();
	const room = useMemo(
		() =>
			searchParams.get("room")?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "main",
		[searchParams],
	);

	const [now, setNow] = useState(() => new Date());
	const [rows, setRows] = useState<Row[]>([]);
	const [status, setStatus] = useState<string>("…");
	const seenRef = useRef<Set<string>>(new Set());
	const orderRef = useRef(0);

	useEffect(() => {
		const t = window.setInterval(() => setNow(new Date()), 50);
		return () => window.clearInterval(t);
	}, []);

	useEffect(() => {
		let supabase: ReturnType<typeof createClient>;
		try {
			supabase = createClient();
		} catch {
			setStatus("Missing Supabase env");
			return;
		}

		seenRef.current = new Set();
		orderRef.current = 0;
		setRows([]);

		const unsub = subscribeBidTrackerChannel(
			supabase,
			room,
			(payload) => {
				if (seenRef.current.has(payload.tapId)) return;
				seenRef.current.add(payload.tapId);
				orderRef.current += 1;
				const hostReceived = new Date();
				setRows((prev) => [
					...prev,
					{
						...payload,
						order: orderRef.current,
						hostReceivedLabel: formatMs(hostReceived),
					},
				]);
			},
			(s, err) => {
				if (s === "SUBSCRIBED") setStatus("Live");
				else if (s === "CHANNEL_ERROR")
					setStatus(err?.message || "Channel error");
				else if (s === "TIMED_OUT") setStatus("Timed out");
				else if (s === "CLOSED") setStatus("Disconnected");
				else setStatus(s);
			},
		);

		return unsub;
	}, [room]);

	const clear = useCallback(() => {
		seenRef.current = new Set();
		orderRef.current = 0;
		setRows([]);
	}, []);

	return (
		<div className="min-h-[70vh] px-4 py-6 max-w-lg mx-auto flex flex-col gap-5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs text-gray-500">Host · room</p>
					<p className="text-lg font-bold font-mono tracking-tight">{room}</p>
					<p className="text-xs mt-1 text-gray-600">
						Status: <span className="font-medium">{status}</span>
					</p>
				</div>
				<button
					type="button"
					onClick={clear}
					className="text-sm font-medium text-red-600 shrink-0 py-1 px-2 rounded-lg hover:bg-red-50"
				>
					Clear list
				</button>
			</div>

			<div className="rounded-2xl bg-gray-900 text-white px-5 py-6 text-center shadow-lg">
				<p className="text-xs uppercase tracking-widest text-white/60 mb-2">Current time</p>
				<p className="text-4xl sm:text-5xl font-mono font-semibold tabular-nums">
					{formatMs(now)}
				</p>
			</div>

			<div>
				<h2 className="text-sm font-semibold text-gray-800 mb-2">
					Taps (first at top)
				</h2>
				{rows.length === 0 ? (
					<p className="text-sm text-gray-500 py-8 text-center border border-dashed border-gray-200 rounded-xl">
						Waiting for taps…
					</p>
				) : (
					<ul className="space-y-2">
						{rows.map((r) => (
							<li
								key={r.tapId}
								className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm flex flex-col gap-1"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="font-semibold text-gray-900">{r.displayName}</span>
									<span className="text-xs font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
										#{r.order}
									</span>
								</div>
								<div className="text-xs text-gray-600 space-y-0.5">
									<p>
										<span className="text-gray-500">Their device: </span>
										<span className="font-mono">{r.clientTimeIso}</span>
									</p>
									<p>
										<span className="text-gray-500">Seen by host: </span>
										<span className="font-mono">{r.hostReceivedLabel}</span>
									</p>
								</div>
							</li>
						))}
					</ul>
				)}
			</div>

			<p className="text-xs text-gray-500">
				Ordering uses arrival at this screen. For a fair “first tap” line, have everyone on
				similar networks; device clocks can still differ from the “Their device” line.
			</p>

			<Link
				href={`/bid-tracker?room=${encodeURIComponent(room)}`}
				className="text-sm text-red-600 font-medium hover:underline"
			>
				← Room setup
			</Link>
		</div>
	);
}

export default function BidTrackerHostPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-[40vh] flex items-center justify-center text-gray-500 text-sm">
					Loading host…
				</div>
			}
		>
			<BidTrackerHostInner />
		</Suspense>
	);
}
