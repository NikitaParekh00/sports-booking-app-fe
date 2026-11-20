import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { findAuctionPlayerPoolByPhone } from '@/lib/auctionPlayerByPhone';
import { mapSportRatingsField } from '@/lib/sportRatings';

const POOL_FIELDS =
    'id, player_order, name, photo, age, skill, category, phone, experience, active_sport, played_s1, batting_hand, bowling_hand, wing, flat_no, sport_ratings';

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

        const supabase = getServiceSupabase();
        const match = await findAuctionPlayerPoolByPhone(supabase, sessionId, phone);

        if (!match.ok) {
            if (match.reason === 'query_error') {
                return NextResponse.json({ error: 'Could not load profile' }, { status: 500 });
            }
            if (match.reason === 'ambiguous') {
                return NextResponse.json(
                    {
                        error: 'ambiguous',
                        message: 'Multiple players match this phone. Contact the auction admin.',
                    },
                    { status: 409 }
                );
            }
            return NextResponse.json(
                {
                    error: 'not_found',
                    message: 'No player found for your phone number in this auction session.',
                },
                { status: 404 }
            );
        }

        const { data: fullPlayer, error: playerError } = await supabase
            .from('auction_player_pool')
            .select(POOL_FIELDS)
            .eq('id', match.player.id)
            .single();

        if (playerError || !fullPlayer) {
            console.error('my-profile load player:', playerError);
            return NextResponse.json({ error: 'Could not load profile' }, { status: 500 });
        }

        const { data: session } = await supabase
            .from('auction_sessions')
            .select('session_name, tournament_logo, tournament_dates')
            .eq('id', sessionId)
            .maybeSingle();

        let approval: { approved_at: string; approver_name: string | null } | null = null;
        const approvalRes = await supabase
            .from('auction_profile_approvals')
            .select('approved_at, approver_name')
            .eq('session_id', sessionId)
            .eq('player_pool_id', match.player.id)
            .maybeSingle();
        if (!approvalRes.error && approvalRes.data) {
            approval = approvalRes.data;
        }

        const player = {
            ...fullPlayer,
            sport_ratings: mapSportRatingsField(fullPlayer.sport_ratings),
        };

        return NextResponse.json({
            sessionName: session?.session_name ?? null,
            tournamentLogo:
                typeof session?.tournament_logo === 'string' && session.tournament_logo.trim()
                    ? session.tournament_logo.trim()
                    : null,
            tournamentDates:
                typeof session?.tournament_dates === 'string' && session.tournament_dates.trim()
                    ? session.tournament_dates.trim()
                    : null,
            player,
            approval: approval
                ? { approvedAt: approval.approved_at, approverName: approval.approver_name }
                : null,
        });
    } catch (e) {
        console.error('my-profile:', e);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}