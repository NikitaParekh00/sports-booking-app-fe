import type { SupabaseClient } from '@supabase/supabase-js';
import { phoneLast10, phoneMatchVariants } from '@/lib/phoneNormalize';

const POOL_ID_FIELDS = 'id, name, phone';

export async function findAuctionPlayerPoolByPhone(
    supabase: SupabaseClient,
    sessionId: string,
    phone: string
): Promise<
    | { ok: true; player: { id: string; name: string; phone: string | null } }
    | { ok: false; reason: 'not_found' | 'ambiguous' | 'query_error' }
> {
    const variants = phoneMatchVariants(phone);

    const exact = await supabase
        .from('auction_player_pool')
        .select(POOL_ID_FIELDS)
        .eq('session_id', sessionId)
        .in('phone', variants)
        .limit(2);

    if (exact.error) {
        return { ok: false, reason: 'query_error' };
    }

    let rows = exact.data ?? [];

    if (rows.length === 0) {
        const last10 = phoneLast10(phone);
        if (last10) {
            const fuzzy = await supabase
                .from('auction_player_pool')
                .select(POOL_ID_FIELDS)
                .eq('session_id', sessionId)
                .ilike('phone', `%${last10}`);
            if (!fuzzy.error && fuzzy.data) {
                rows = fuzzy.data.filter(
                    (p) => p.phone && phoneLast10(String(p.phone)) === last10
                );
            }
        }
    }

    if (rows.length === 0) {
        return { ok: false, reason: 'not_found' };
    }
    if (rows.length > 1) {
        return { ok: false, reason: 'ambiguous' };
    }

    const row = rows[0];
    return {
        ok: true,
        player: {
            id: String(row.id),
            name: String(row.name),
            phone: row.phone != null ? String(row.phone) : null,
        },
    };
}