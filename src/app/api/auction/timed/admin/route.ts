import { NextRequest, NextResponse } from 'next/server';
import { isAuctionAdminPhone } from '@/lib/auctionAccess';
import { openLotAtIndex, resolveTimedLot, startLotTimer } from '@/lib/auctionTimedLot';
import { getServiceSupabase } from '@/lib/supabaseService';

type AdminAction = 'start_mode' | 'stop_mode' | 'open_lot' | 'close_lot' | 'set_duration' | 'start_lot_timer';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
        const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
        const action = body.action as AdminAction;

        if (!sessionId || !action) {
            return NextResponse.json({ error: 'sessionId and action required' }, { status: 400 });
        }
        if (!isAuctionAdminPhone(phone)) {
            return NextResponse.json({ error: 'Admin only' }, { status: 403 });
        }

        const supabase = getServiceSupabase();

        if (action === 'set_duration') {
            const seconds = Number(body.lotDurationSeconds);
            if (!Number.isFinite(seconds) || seconds < 30 || seconds > 3600) {
                return NextResponse.json({ error: 'lotDurationSeconds must be 30–3600' }, { status: 400 });
            }
            await supabase
                .from('auction_sessions')
                .update({ lot_duration_seconds: Math.round(seconds) })
                .eq('id', sessionId);
            return NextResponse.json({ ok: true });
        }

        if (action === 'start_mode') {
            const seconds = Number(body.lotDurationSeconds);
            const updates: Record<string, unknown> = {
                auction_mode: 'timed_owner',
                lot_ends_at: null,
                timed_lot_player_pool_id: null,
            };
            if (Number.isFinite(seconds) && seconds >= 30) {
                updates.lot_duration_seconds = Math.round(seconds);
            }
            await supabase.from('auction_sessions').update(updates).eq('id', sessionId);
            return NextResponse.json({ ok: true, message: 'Timed owner mode enabled' });
        }

        if (action === 'stop_mode') {
            await supabase
                .from('auction_sessions')
                .update({
                    auction_mode: 'live_admin',
                    lot_ends_at: null,
                    timed_lot_player_pool_id: null,
                })
                .eq('id', sessionId);
            return NextResponse.json({ ok: true, message: 'Back to live admin mode' });
        }

        if (action === 'open_lot') {
            const { data: session } = await supabase
                .from('auction_sessions')
                .select(
                    'current_player_index, auction_mode, is_skipped_players_mode, skipped_players_index'
                )
                .eq('id', sessionId)
                .single();
            if (session?.auction_mode !== 'timed_owner') {
                return NextResponse.json({ error: 'Enable timed mode first' }, { status: 400 });
            }
            const startIndex =
                session.is_skipped_players_mode === true
                    ? Number(session.skipped_players_index) || 0
                    : typeof body.playerIndex === 'number'
                      ? body.playerIndex
                      : Number(session.current_player_index) || 0;
            const result = await openLotAtIndex(supabase, sessionId, startIndex);
            return NextResponse.json(result, { status: result.ok ? 200 : 400 });
        }

        if (action === 'close_lot') {
            const autoNext = body.autoStartNextLot !== false;
            const result = await resolveTimedLot(supabase, sessionId, autoNext);
            return NextResponse.json(result, { status: result.ok ? 200 : 400 });
        }

        if (action === 'start_lot_timer') {
            const result = await startLotTimer(supabase, sessionId);
            return NextResponse.json(result, { status: result.ok ? 200 : 400 });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (e) {
        console.error('timed/admin:', e);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}