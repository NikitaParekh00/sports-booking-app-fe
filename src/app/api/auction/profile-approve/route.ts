import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { findAuctionPlayerPoolByPhone } from '@/lib/auctionPlayerByPhone';

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asUuidOrNull(value: string | null | undefined): string | null {
    if (!value?.trim()) return null;
    return UUID_RE.test(value.trim()) ? value.trim() : null;
}

function getServiceSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '');
    const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!url || !key) {
        throw new Error('Supabase env not configured');
    }
    return createClient(url, key);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
        const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
        const playerPoolId = typeof body.playerPoolId === 'string' ? body.playerPoolId.trim() : '';
        const playerName = typeof body.playerName === 'string' ? body.playerName.trim() : null;
        const approverUserId = typeof body.approverUserId === 'string' ? body.approverUserId : null;
        const approverName = typeof body.approverName === 'string' ? body.approverName.trim() : null;

        if (!sessionId || !phone || !playerPoolId) {
            return NextResponse.json(
                { error: 'sessionId, phone, and playerPoolId are required' },
                { status: 400 }
            );
        }
        if (!UUID_RE.test(sessionId) || !UUID_RE.test(playerPoolId)) {
            return NextResponse.json({ error: 'Invalid session or player id' }, { status: 400 });
        }

        const supabase = getServiceSupabase();
        const match = await findAuctionPlayerPoolByPhone(supabase, sessionId, phone);
        if (!match.ok) {
            const message =
                match.reason === 'ambiguous'
                    ? 'Multiple players match this phone. Contact the auction admin.'
                    : match.reason === 'not_found'
                      ? 'No player found for your phone in this session.'
                      : 'Could not verify your profile.';
            return NextResponse.json({ error: match.reason, message }, { status: match.reason === 'query_error' ? 500 : 404 });
        }
        if (match.player.id !== playerPoolId) {
            return NextResponse.json({ error: 'forbidden', message: 'Player does not match your login.' }, { status: 403 });
        }

        const row = {
            session_id: sessionId,
            player_pool_id: playerPoolId,
            player_name: playerName ?? match.player.name,
            approver_phone: phone,
            approver_user_id: approverUserId,
            approver_name: approverName,
            approved_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('auction_profile_approvals')
            .upsert(row, { onConflict: 'session_id,player_pool_id' })
            .select('approved_at, approver_name')
            .single();

        if (error) {
            console.error('profile-approve upsert:', error);
            const hint =
                error.code === '42501' || error.message?.toLowerCase().includes('policy')
                    ? 'Run db/auction_profile_approvals_rls_fix.sql in Supabase (anon SELECT + insert/update policies).'
                    : error.code === '42P01'
                      ? 'Table auction_profile_approvals does not exist — run db/auction_profile_approvals.sql.'
                      : 'Check Supabase logs.';
            return NextResponse.json(
                {
                    error: 'save_failed',
                    message: `Could not save approval. ${hint}`,
                    detail: process.env.NODE_ENV === 'development' ? error.message : undefined,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            approvedAt: data?.approved_at ?? row.approved_at,
            approverName: data?.approver_name ?? approverName,
        });
    } catch (e) {
        console.error('profile-approve:', e);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}