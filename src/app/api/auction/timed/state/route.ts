import { NextRequest, NextResponse } from 'next/server';
import { isAuctionAdminPhone } from '@/lib/auctionAccess';
import {
    boughtPlayerNames,
    findTeamForOwnerPhone,
    findUnsoldFromIndex,
    loadOrderedPool,
    loadTimedSettings,
    minBidForPlayer,
    resolveTimedLot,
} from '@/lib/auctionTimedLot';
import { getServiceSupabase } from '@/lib/supabaseService';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
        const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        const { data: session } = await supabase
            .from('auction_sessions')
            .select(
                'id, session_name, auction_mode, current_player_index, lot_ends_at, timed_lot_player_pool_id, lot_duration_seconds, is_complete, current_bid_amount'
            )
            .eq('id', sessionId)
            .maybeSingle();

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        if (
            session.auction_mode === 'timed_owner' &&
            session.lot_ends_at &&
            new Date(session.lot_ends_at).getTime() <= Date.now() &&
            session.timed_lot_player_pool_id
        ) {
            await resolveTimedLot(supabase, sessionId, true);
            const { data: refreshed } = await supabase
                .from('auction_sessions')
                .select(
                    'id, session_name, auction_mode, current_player_index, lot_ends_at, timed_lot_player_pool_id, lot_duration_seconds, is_complete, current_bid_amount'
                )
                .eq('id', sessionId)
                .maybeSingle();
            if (refreshed) Object.assign(session, refreshed);
        }

        const pool = await loadOrderedPool(supabase, sessionId);
        const bought = await boughtPlayerNames(supabase, sessionId);
        const current = findUnsoldFromIndex(pool, bought, Number(session.current_player_index) ?? 0);
        const settings = await loadTimedSettings(supabase, sessionId);

        let lotPlayer = null;
        if (session.timed_lot_player_pool_id) {
            const { data: p } = await supabase
                .from('auction_player_pool')
                .select('id, name, category, player_order, photo, age, skill')
                .eq('id', session.timed_lot_player_pool_id)
                .maybeSingle();
            lotPlayer = p;
        }

        let highBid: number | null = null;
        let bidCount = 0;
        if (session.timed_lot_player_pool_id) {
            const { data: bids } = await supabase
                .from('auction_lot_bids')
                .select('amount')
                .eq('session_id', sessionId)
                .eq('player_pool_id', session.timed_lot_player_pool_id);
            bidCount = bids?.length ?? 0;
            if (bids?.length) {
                highBid = Math.max(...bids.map((b) => Number(b.amount)));
            }
        }

        const isAdmin = isAuctionAdminPhone(phone);
        const team = phone ? await findTeamForOwnerPhone(supabase, sessionId, phone) : null;

        let myBid: number | null = null;
        if (team && session.timed_lot_player_pool_id) {
            const { data: row } = await supabase
                .from('auction_lot_bids')
                .select('amount')
                .eq('session_id', sessionId)
                .eq('player_pool_id', session.timed_lot_player_pool_id)
                .eq('team_id', team.id)
                .maybeSingle();
            myBid = row ? Number(row.amount) : null;
        }

        const minBid = lotPlayer ? minBidForPlayer(lotPlayer.category, settings) : null;

        const lotStaged = Boolean(session.timed_lot_player_pool_id);
        const lotBiddingOpen = Boolean(
            session.timed_lot_player_pool_id &&
                session.lot_ends_at &&
                new Date(session.lot_ends_at).getTime() > Date.now()
        );

        const sealOtherBids = lotBiddingOpen && !isAdmin;

        return NextResponse.json({
            session: {
                id: session.id,
                session_name: session.session_name,
                auction_mode: session.auction_mode,
                is_complete: session.is_complete,
                lot_ends_at: session.lot_ends_at,
                lot_duration_seconds: session.lot_duration_seconds,
                current_player_index: session.current_player_index,
            },
            lotStaged,
            lotBiddingOpen,
            lotOpen: lotBiddingOpen,
            lotPlayer,
            minBid,
            highBid: sealOtherBids ? null : highBid,
            bidCount: sealOtherBids ? 0 : bidCount,
            isAdmin,
            team: team
                ? { id: team.id, name: team.name, budget: team.budget, team_number: team.team_number }
                : null,
            myBid,
            settingsPlayersPerTeam: settings?.players_per_team ?? 11,
            unsoldCount: pool.filter((p) => !bought.has(p.name)).length,
            currentPlayerName: current?.player.name ?? null,
        });
    } catch (e) {
        console.error('timed/state:', e);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}