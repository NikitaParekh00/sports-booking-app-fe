import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseService';

export async function POST() {
    try {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
            .from('auction_sessions')
            .select('id, session_name, auction_mode, is_complete')
            .eq('is_complete', false)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ sessions: data ?? [] });
    } catch (e) {
        console.error('timed/sessions:', e);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}