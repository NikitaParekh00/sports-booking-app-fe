import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
        const message = typeof body.message === 'string' ? body.message.trim() : '';
        const playerPoolId = typeof body.playerPoolId === 'string' ? body.playerPoolId : null;
        const playerName = typeof body.playerName === 'string' ? body.playerName.trim() : null;
        const reporterUserId = typeof body.reporterUserId === 'string' ? body.reporterUserId : null;
        const reporterName = typeof body.reporterName === 'string' ? body.reporterName.trim() : null;

        if (!phone || !message) {
            return NextResponse.json({ error: 'phone and message are required' }, { status: 400 });
        }
        if (message.length < 5) {
            return NextResponse.json({ error: 'Please describe the issue in a few words.' }, { status: 400 });
        }
        if (message.length > 2000) {
            return NextResponse.json({ error: 'Message is too long' }, { status: 400 });
        }

        const supabase = getServiceSupabase();
        const { error } = await supabase.from('auction_profile_issues').insert({
            session_id: asUuidOrNull(sessionId),
            player_pool_id: asUuidOrNull(playerPoolId),
            player_name: playerName,
            reporter_phone: phone,
            reporter_user_id: reporterUserId,
            reporter_name: reporterName,
            message,
            status: 'open',
        });

        if (error) {
            console.error('profile-issue insert:', error);
            const hint =
                error.code === '42501' || error.message?.toLowerCase().includes('policy')
                    ? 'Run db/auction_profile_issues_rls_fix.sql in Supabase (insert policy).'
                    : error.code === 'PGRST205' || error.message?.toLowerCase().includes('schema cache')
                      ? 'Table missing — run db/auction_profile_issues.sql, then reload API schema in Supabase.'
                      : error.code === '42P01'
                        ? 'Table auction_profile_issues does not exist — run db/auction_profile_issues.sql.'
                        : 'Check Supabase logs or run db/auction_profile_issues_rls_fix.sql.';
            return NextResponse.json(
                {
                    error: 'save_failed',
                    message: `Could not save your report. ${hint}`,
                    detail: process.env.NODE_ENV === 'development' ? error.message : undefined,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error('profile-issue:', e);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}