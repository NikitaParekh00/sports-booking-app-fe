import { NextRequest, NextResponse } from 'next/server';
import {
    findTeamForOwnerPhone,
    loadTimedSettings,
    minBidForPlayer,
    teamRosterCount,
} from '@/lib/auctionTimedLot';
import { getServiceSupabase, hasServiceRoleKey } from '@/lib/supabaseService';

export async function POST(request: NextRequest) {
    try {
        if (!hasServiceRoleKey()) {
            return NextResponse.json(
                {
                    error: 'server_config',
                    message:
                        'Add SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API → secret / legacy service_role) to .env.local and restart the dev server.',
                },
                { status: 503 }
            );
        }

        const body = await request.json();
        const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
        const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
        const amount = Number(body.amount);

        if (!sessionId || !phone || !Number.isFinite(amount)) {
            return NextResponse.json({ error: 'sessionId, phone, and amount required' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        const { data: session } = await supabase
            .from('auction_sessions')
            .select('auction_mode, timed_lot_player_pool_id, lot_ends_at, is_complete')
            .eq('id', sessionId)
            .single();

        if (!session || session.auction_mode !== 'timed_owner' || session.is_complete) {
            return NextResponse.json({ error: 'Timed bidding is not active' }, { status: 400 });
        }
        if (!session.timed_lot_player_pool_id) {
            return NextResponse.json({ error: 'No lot is open right now' }, { status: 400 });
        }
        if (!session.lot_ends_at) {
            return NextResponse.json(
                { error: 'Timer not started — wait for auction admin to start the timer on the live screen.' },
                { status: 400 }
            );
        }
        if (new Date(session.lot_ends_at).getTime() <= Date.now()) {
            return NextResponse.json({ error: 'Lot closed — wait for results' }, { status: 400 });
        }

        const team = await findTeamForOwnerPhone(supabase, sessionId, phone);
        if (!team) {
            return NextResponse.json(
                { error: 'not_owner', message: 'No team linked to your phone. Ask admin to set owner phone on your team.' },
                { status: 403 }
            );
        }

        const { data: player } = await supabase
            .from('auction_player_pool')
            .select('category')
            .eq('id', session.timed_lot_player_pool_id)
            .single();

        const settings = await loadTimedSettings(supabase, sessionId);
        const floor = minBidForPlayer(player?.category, settings);
        if (amount < floor) {
            return NextResponse.json({ error: `Bid must be at least ₹${floor}` }, { status: 400 });
        }
        if (amount > Number(team.budget)) {
            return NextResponse.json({ error: 'Bid exceeds your remaining budget' }, { status: 400 });
        }

        const roster = await teamRosterCount(supabase, team.id);
        const maxPlayers = settings?.players_per_team ?? 11;
        if (roster >= maxPlayers) {
            return NextResponse.json({ error: 'Your team roster is full' }, { status: 400 });
        }

        const { error } = await supabase.from('auction_lot_bids').upsert(
            {
                session_id: sessionId,
                player_pool_id: session.timed_lot_player_pool_id,
                team_id: team.id,
                amount,
                bidder_phone: phone,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'session_id,player_pool_id,team_id' }
        );

        if (error) {
            console.error('timed/bid upsert:', error);
            const hint =
                error.code === '42P01'
                    ? 'Run db/auction_timed_owner_mode.sql in Supabase.'
                    : error.code === '42501' || error.message?.includes('policy')
                      ? 'Server cannot write bids — check SUPABASE_SERVICE_ROLE_KEY.'
                      : error.message;
            return NextResponse.json(
                { error: 'Could not save bid', message: hint, code: error.code },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true, amount });
    } catch (e) {
        console.error('timed/bid:', e);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}