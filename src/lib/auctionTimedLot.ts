import type { SupabaseClient } from '@supabase/supabase-js';
import { phoneLast10, phoneMatchVariants } from '@/lib/phoneNormalize';

const DEFAULT_MINIMUM_BID = 5000;

export type AuctionMode = 'live_admin' | 'timed_owner';

export interface TimedAuctionSettings {
    minimum_bid: number;
    players_per_team: number;
    category_minimum_bids?: Record<string, number> | null;
}

export function minBidForPlayer(
    category: string | null | undefined,
    settings: TimedAuctionSettings | null
): number {
    if (category && settings?.category_minimum_bids?.[category]) {
        const c = Number(settings.category_minimum_bids[category]);
        if (Number.isFinite(c) && c > 0) return c;
    }
    const base = Number(settings?.minimum_bid);
    return Number.isFinite(base) && base > 0 ? base : DEFAULT_MINIMUM_BID;
}

export async function loadTimedSettings(
    supabase: SupabaseClient,
    sessionId: string
): Promise<TimedAuctionSettings | null> {
    const { data } = await supabase
        .from('auction_settings')
        .select('minimum_bid, players_per_team, category_minimum_bids')
        .eq('session_id', sessionId)
        .maybeSingle();
    if (!data) return null;
    return {
        minimum_bid: Number(data.minimum_bid) || DEFAULT_MINIMUM_BID,
        players_per_team: Number(data.players_per_team) || 11,
        category_minimum_bids: (data.category_minimum_bids as Record<string, number>) ?? null,
    };
}

export async function findTeamForOwnerPhone(
    supabase: SupabaseClient,
    sessionId: string,
    phone: string
): Promise<{ id: string; name: string; budget: number; team_number: number } | null> {
    const variants = phoneMatchVariants(phone);
    const last10 = phoneLast10(phone);

    const { data: teams } = await supabase
        .from('auction_teams')
        .select('id, name, budget, team_number, owner_phone')
        .eq('session_id', sessionId);

    if (!teams?.length) return null;

    for (const t of teams) {
        if (!t.owner_phone) continue;
        if (variants.includes(t.owner_phone.trim())) return t;
        if (last10 && phoneLast10(t.owner_phone) === last10) return t;
    }
    return null;
}

export async function boughtPlayerNames(
    supabase: SupabaseClient,
    sessionId: string
): Promise<Set<string>> {
    const { data } = await supabase
        .from('auction_players')
        .select('player_name')
        .eq('session_id', sessionId);
    return new Set((data ?? []).map((r) => r.player_name));
}

type PoolRow = { id: string; name: string; category?: string | null; player_order: number };

export async function loadOrderedPool(
    supabase: SupabaseClient,
    sessionId: string
): Promise<PoolRow[]> {
    const { data: pool } = await supabase
        .from('auction_player_pool')
        .select('id, name, category, player_order')
        .eq('session_id', sessionId)
        .order('player_order', { ascending: true });
    return pool ?? [];
}

/** Index matches live auction: position in full pool list; skips sold when resolving display. */
export function findUnsoldFromIndex(
    pool: PoolRow[],
    bought: Set<string>,
    startIndex: number
): { player: PoolRow; index: number } | null {
    for (let i = Math.max(0, startIndex); i < pool.length; i++) {
        if (!bought.has(pool[i].name)) return { player: pool[i], index: i };
    }
    return null;
}

export type TimedLotBidRow = { teamName: string; amount: number };

/** All bids for a lot (for projector reveal when the timer ends). */
export async function loadLotBidsWithTeamNames(
    supabase: SupabaseClient,
    sessionId: string,
    poolId: string
): Promise<TimedLotBidRow[]> {
    const { data: bids } = await supabase
        .from('auction_lot_bids')
        .select('team_id, amount, updated_at')
        .eq('session_id', sessionId)
        .eq('player_pool_id', poolId)
        .order('amount', { ascending: false })
        .order('updated_at', { ascending: true });

    if (!bids?.length) return [];

    const teamIds = [...new Set(bids.map((b) => b.team_id))];
    const { data: teams } = await supabase.from('auction_teams').select('id, name').in('id', teamIds);
    const nameById = new Map((teams ?? []).map((t) => [t.id, t.name as string]));

    return bids.map((b) => ({
        teamName: nameById.get(b.team_id) ?? 'Team',
        amount: Number(b.amount),
    }));
}

export async function teamRosterCount(supabase: SupabaseClient, teamId: string): Promise<number> {
    const { count } = await supabase
        .from('auction_players')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', teamId);
    return count ?? 0;
}

export interface ResolveLotResult {
    ok: boolean;
    sold: boolean;
    message: string;
    playerName?: string;
    teamName?: string;
    amount?: number;
    auctionComplete?: boolean;
}

type TimedSessionRow = {
    auction_mode?: string | null;
    lot_duration_seconds?: number | null;
    is_complete?: boolean | null;
    current_player_index?: number | null;
    skipped_players_index?: number | null;
    is_skipped_players_mode?: boolean | null;
};

type LotTarget = { player: PoolRow; poolIndex: number; skippedIndex?: number };

/** Same as live auction Skip — adds player to skipped queue for later. */
export async function addPlayerToSkippedList(
    supabase: SupabaseClient,
    sessionId: string,
    poolPlayer: { id: string; name: string; player_order: number }
): Promise<void> {
    const { error } = await supabase.from('auction_skipped_players').insert({
        session_id: sessionId,
        player_pool_id: poolPlayer.id,
        player_name: poolPlayer.name,
        player_order: poolPlayer.player_order,
    });
    if (error && error.code !== '23505') {
        console.error('addPlayerToSkippedList:', error);
    }
}

export async function removePlayerFromSkippedList(
    supabase: SupabaseClient,
    sessionId: string,
    poolId: string
): Promise<void> {
    await supabase.from('auction_skipped_players').delete().eq('session_id', sessionId).eq('player_pool_id', poolId);
}

export async function findTimedLotTarget(
    supabase: SupabaseClient,
    sessionId: string,
    session: TimedSessionRow,
    startIndex: number
): Promise<LotTarget | null> {
    const bought = await boughtPlayerNames(supabase, sessionId);

    if (session.is_skipped_players_mode === true) {
        const { data: skipped } = await supabase
            .from('auction_skipped_players')
            .select('player_pool_id, player_name, player_order')
            .eq('session_id', sessionId)
            .order('player_order', { ascending: true });

        if (!skipped?.length) return null;

        const pool = await loadOrderedPool(supabase, sessionId);
        const from = Math.max(0, startIndex);
        for (let i = from; i < skipped.length; i++) {
            const row = skipped[i];
            if (bought.has(row.player_name)) continue;
            const player = pool.find((p) => p.id === row.player_pool_id);
            if (!player || bought.has(player.name)) continue;
            const poolIndex = pool.findIndex((p) => p.id === player.id);
            if (poolIndex < 0) continue;
            return { player, poolIndex, skippedIndex: i };
        }
        return null;
    }

    const pool = await loadOrderedPool(supabase, sessionId);
    const found = findUnsoldFromIndex(pool, bought, Math.max(0, startIndex));
    return found ? { player: found.player, poolIndex: found.index } : null;
}

async function commitOpenLot(
    supabase: SupabaseClient,
    sessionId: string,
    session: TimedSessionRow,
    target: LotTarget
): Promise<{ ok: boolean; message: string }> {
    const duration = Number(session.lot_duration_seconds) || 180;
    const endsAt = new Date(Date.now() + duration * 1000).toISOString();
    const settings = await loadTimedSettings(supabase, sessionId);
    const minBid = minBidForPlayer(target.player.category, settings);

    const updates: Record<string, unknown> = {
        current_player_index: target.poolIndex,
        timed_lot_player_pool_id: target.player.id,
        lot_ends_at: endsAt,
        current_bid_amount: minBid,
        current_bid_team_id: null,
    };
    if (session.is_skipped_players_mode === true && target.skippedIndex != null) {
        updates.skipped_players_index = target.skippedIndex;
        updates.is_skipped_players_mode = true;
    }

    await supabase.from('auction_sessions').update(updates).eq('id', sessionId);
    return { ok: true, message: `Lot open for ${target.player.name}` };
}

function nextTimedLotStartIndex(session: TimedSessionRow, target: LotTarget): number {
    if (session.is_skipped_players_mode === true) {
        const cur = target.skippedIndex ?? Number(session.skipped_players_index) ?? 0;
        return cur + 1;
    }
    return target.poolIndex + 1;
}

async function lotContextForPoolId(
    supabase: SupabaseClient,
    sessionId: string,
    session: TimedSessionRow,
    poolId: string
): Promise<LotTarget | null> {
    const pool = await loadOrderedPool(supabase, sessionId);
    const poolIndex = pool.findIndex((p) => p.id === poolId);
    if (poolIndex < 0) return null;
    const player = pool[poolIndex];

    if (session.is_skipped_players_mode === true) {
        const { data: skipped } = await supabase
            .from('auction_skipped_players')
            .select('player_pool_id')
            .eq('session_id', sessionId)
            .order('player_order', { ascending: true });
        const skippedIndex = skipped?.findIndex((s) => s.player_pool_id === poolId) ?? -1;
        return {
            player,
            poolIndex,
            skippedIndex: skippedIndex >= 0 ? skippedIndex : Number(session.skipped_players_index) || 0,
        };
    }
    return { player, poolIndex };
}

/** Pick highest valid bid and sell, or skip lot. Advance player index; optionally open next lot. */
export async function resolveTimedLot(
    supabase: SupabaseClient,
    sessionId: string,
    autoStartNextLot: boolean
): Promise<ResolveLotResult> {
    const { data: session, error: sessionErr } = await supabase
        .from('auction_sessions')
        .select(
            'id, auction_mode, current_player_index, skipped_players_index, is_skipped_players_mode, lot_ends_at, timed_lot_player_pool_id, lot_duration_seconds, is_complete'
        )
        .eq('id', sessionId)
        .single();

    if (sessionErr || !session) {
        return { ok: false, sold: false, message: 'Session not found' };
    }
    if (session.auction_mode !== 'timed_owner') {
        return { ok: false, sold: false, message: 'Not in timed owner mode' };
    }
    if (session.is_complete) {
        return { ok: false, sold: false, message: 'Auction already complete' };
    }

    const poolId = session.timed_lot_player_pool_id as string | null;
    if (!poolId) {
        return { ok: false, sold: false, message: 'No open lot' };
    }

    const { data: poolPlayer } = await supabase
        .from('auction_player_pool')
        .select('id, name, category, player_order')
        .eq('id', poolId)
        .single();

    if (!poolPlayer) {
        return { ok: false, sold: false, message: 'Player not found' };
    }

    const bought = await boughtPlayerNames(supabase, sessionId);
    if (bought.has(poolPlayer.name)) {
        await clearLot(supabase, sessionId);
        return { ok: true, sold: false, message: 'Player already sold' };
    }

    const settings = await loadTimedSettings(supabase, sessionId);
    const floor = minBidForPlayer(poolPlayer.category, settings);
    const playersPerTeam = settings?.players_per_team ?? 11;

    const { data: bids } = await supabase
        .from('auction_lot_bids')
        .select('team_id, amount, updated_at')
        .eq('session_id', sessionId)
        .eq('player_pool_id', poolId)
        .order('amount', { ascending: false })
        .order('updated_at', { ascending: true });

    let winner: { team_id: string; amount: number } | null = null;

    if (bids?.length) {
        for (const b of bids) {
            const amount = Number(b.amount);
            if (!Number.isFinite(amount) || amount < floor) continue;

            const { data: team } = await supabase
                .from('auction_teams')
                .select('id, name, budget')
                .eq('id', b.team_id)
                .single();
            if (!team) continue;

            const roster = await teamRosterCount(supabase, team.id);
            if (roster >= playersPerTeam) continue;
            if (Number(team.budget) < amount) continue;

            winner = { team_id: team.id, amount };
            break;
        }
    }

    if (winner) {
        const { data: team } = await supabase
            .from('auction_teams')
            .select('id, name, budget, team_number')
            .eq('id', winner.team_id)
            .single();

        if (!team) {
            return { ok: false, sold: false, message: 'Winning team missing' };
        }

        const { error: insertErr } = await supabase.from('auction_players').insert({
            session_id: sessionId,
            team_id: team.id,
            player_name: poolPlayer.name,
            bid_amount: winner.amount,
        });
        if (insertErr) {
            return { ok: false, sold: false, message: insertErr.message };
        }

        const newBudget = Number(team.budget) - winner.amount;
        await supabase.from('auction_teams').update({ budget: newBudget }).eq('id', team.id);
        await removePlayerFromSkippedList(supabase, sessionId, poolId);

        const bidSummary = await loadLotBidsWithTeamNames(supabase, sessionId, poolId);
        const soldPlayerInfo = {
            playerName: poolPlayer.name,
            teamName: team.name,
            amount: winner.amount,
            timedReveal: true,
            sold: true,
            bids: bidSummary,
        };

        const lotCtx = await lotContextForPoolId(supabase, sessionId, session, poolId);
        const nextStart = lotCtx ? nextTimedLotStartIndex(session, lotCtx) : Number(session.current_player_index) + 1;
        const nextTarget = await findTimedLotTarget(supabase, sessionId, session, nextStart);
        const auctionComplete = !nextTarget;

        await supabase
            .from('auction_sessions')
            .update({
                sold_player_info: soldPlayerInfo,
                congratulations_modal_acknowledged: false,
                current_bid_amount: floor,
                current_bid_team_id: null,
                timed_lot_player_pool_id: null,
                lot_ends_at: null,
                is_complete: auctionComplete,
            })
            .eq('id', sessionId);

        await supabase.from('auction_lot_bids').delete().eq('session_id', sessionId).eq('player_pool_id', poolId);

        if (autoStartNextLot && nextTarget) {
            await commitOpenLot(supabase, sessionId, session, nextTarget);
        }

        return {
            ok: true,
            sold: true,
            message: `${poolPlayer.name} sold to ${team.name}`,
            playerName: poolPlayer.name,
            teamName: team.name,
            amount: winner.amount,
            auctionComplete,
        };
    }

    await addPlayerToSkippedList(supabase, sessionId, poolPlayer);

    const lotCtx = await lotContextForPoolId(supabase, sessionId, session, poolId);
    const nextStart = lotCtx ? nextTimedLotStartIndex(session, lotCtx) : Number(session.current_player_index) + 1;
    const nextTarget = await findTimedLotTarget(supabase, sessionId, session, nextStart);
    const auctionComplete = !nextTarget;

    const bidSummary = await loadLotBidsWithTeamNames(supabase, sessionId, poolId);
    const soldPlayerInfo = {
        playerName: poolPlayer.name,
        timedReveal: true,
        sold: false,
        bids: bidSummary,
    };

    await supabase
        .from('auction_sessions')
        .update({
            sold_player_info: soldPlayerInfo,
            congratulations_modal_acknowledged: false,
            timed_lot_player_pool_id: null,
            lot_ends_at: null,
            is_complete: auctionComplete,
        })
        .eq('id', sessionId);

    await supabase.from('auction_lot_bids').delete().eq('session_id', sessionId).eq('player_pool_id', poolId);

    if (autoStartNextLot && nextTarget) {
        await commitOpenLot(supabase, sessionId, session, nextTarget);
    }

    return {
        ok: true,
        sold: false,
        message: 'No valid bids; player remains unsold',
        playerName: poolPlayer.name,
        auctionComplete,
    };
}

export async function clearLot(supabase: SupabaseClient, sessionId: string) {
    await supabase
        .from('auction_sessions')
        .update({ timed_lot_player_pool_id: null, lot_ends_at: null })
        .eq('id', sessionId);
}

export async function openLotAtIndex(
    supabase: SupabaseClient,
    sessionId: string,
    startIndex: number
): Promise<{ ok: boolean; message: string }> {
    const { data: session } = await supabase
        .from('auction_sessions')
        .select(
            'auction_mode, lot_duration_seconds, is_complete, is_skipped_players_mode, skipped_players_index, current_player_index'
        )
        .eq('id', sessionId)
        .single();

    if (!session || session.auction_mode !== 'timed_owner') {
        return { ok: false, message: 'Timed mode is not active' };
    }
    if (session.is_complete) {
        return { ok: false, message: 'Auction complete' };
    }

    const effectiveStart =
        session.is_skipped_players_mode === true
            ? Math.max(0, startIndex)
            : Math.max(0, startIndex);

    const target = await findTimedLotTarget(supabase, sessionId, session, effectiveStart);
    if (!target) {
        await supabase
            .from('auction_sessions')
            .update({ is_complete: true, lot_ends_at: null, timed_lot_player_pool_id: null })
            .eq('id', sessionId);
        return {
            ok: false,
            message:
                session.is_skipped_players_mode === true
                    ? 'No more players in skipped list'
                    : 'No more unsold players',
        };
    }

    return commitOpenLot(supabase, sessionId, session, target);
}