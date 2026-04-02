import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export const BID_TRACKER_EVENT = "bid_tap" as const;

export type BidTapPayload = {
	displayName: string;
	clientTimeIso: string;
	tapId: string;
};

export function bidTrackerChannelName(room: string): string {
	const safe = room.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
	return `bid_tracker_${safe || "main"}`;
}

export function openBidTrackerChannel(supabase: SupabaseClient, room: string): RealtimeChannel {
	const name = bidTrackerChannelName(room);
	return supabase.channel(name, {
		config: { broadcast: { self: true } },
	});
}

export function subscribeBidTrackerChannel(
	supabase: SupabaseClient,
	room: string,
	onTap: (payload: BidTapPayload) => void,
	onStatus: (status: string, err?: Error) => void,
) {
	const ch = openBidTrackerChannel(supabase, room)
		.on("broadcast", { event: BID_TRACKER_EVENT }, ({ payload }) => {
			const p = payload as BidTapPayload | null;
			if (
				p &&
				typeof p.displayName === "string" &&
				typeof p.clientTimeIso === "string" &&
				typeof p.tapId === "string"
			) {
				onTap(p);
			}
		})
		.subscribe((status, err) => {
			onStatus(status, err);
		});

	return () => {
		supabase.removeChannel(ch);
	};
}

export async function sendBidTap(
	channel: RealtimeChannel,
	displayName: string,
): Promise<{ ok: boolean; error?: string }> {
	const payload: BidTapPayload = {
		displayName: displayName.trim() || "Anonymous",
		clientTimeIso: new Date().toISOString(),
		tapId:
			typeof crypto !== "undefined" && crypto.randomUUID
				? crypto.randomUUID()
				: `${Date.now()}-${Math.random()}`,
	};

	const res = await channel.send({
		type: "broadcast",
		event: BID_TRACKER_EVENT,
		payload,
	});

	if (res !== "ok") {
		return { ok: false, error: String(res) };
	}
	return { ok: true };
}
