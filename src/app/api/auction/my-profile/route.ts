import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { phoneLast10, phoneMatchVariants } from '@/lib/phoneNormalize';

const POOL_FIELDS =
    'id, player_order, name, photo, age, skill, category, phone, experience, active_sport';

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

        if (!sessionId || !phone) {
            return NextResponse.json({ error: 'sessionId and phone are required' }, { status: 400 });
        }

        const variants = phoneMatchVariants(phone);
        const supabase = getServiceSupabase();

        let rows: Record<string, unknown>[] | null = null;
        let queryError: Error | null = null;

        const exact = await supabase
            .from('auction_player_pool')
            .select(POOL_FIELDS)
            .eq('session_id', sessionId)
            .in('phone', variants)
            .limit(2);

        if (exact.error) {
            queryError = exact.error;
        } else if (exact.data && exact.data.length > 0) {
            rows = exact.data as Record<string, unknown>[];
        } else {
            const last10 = phoneLast10(phone);
            if (last10) {
                const fuzzy = await supabase
                    .from('auction_player_pool')
                    .select(POOL_FIELDS)
                    .eq('session_id', sessionId)
                    .ilike('phone', `%${last10}`);
                if (!fuzzy.error && fuzzy.data) {
                    rows = fuzzy.data.filter(
                        (p) => p.phone && phoneLast10(String(p.phone)) === last10
                    ) as Record<string, unknown>[];
                }
            }
        }

        if (queryError) {
            console.error('my-profile query error:', queryError);
            return NextResponse.json({ error: 'Could not load profile' }, { status: 500 });
        }

        if (!rows || rows.length === 0) {
            return NextResponse.json(
                {
                    error: 'not_found',
                    message: 'No player found for your phone number in this auction session.',
                },
                { status: 404 }
            );
        }

        if (rows.length > 1) {
            return NextResponse.json(
                {
                    error: 'ambiguous',
                    message: 'Multiple players match this phone. Contact the auction admin.',
                },
                { status: 409 }
            );
        }

        const { data: session } = await supabase
            .from('auction_sessions')
            .select('session_name')
            .eq('id', sessionId)
            .maybeSingle();

        return NextResponse.json({
            sessionName: session?.session_name ?? null,
            player: rows[0],
        });
    } catch (e) {
        console.error('my-profile:', e);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}