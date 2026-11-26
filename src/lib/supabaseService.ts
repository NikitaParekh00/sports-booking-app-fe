import { createClient } from '@supabase/supabase-js';

export function hasServiceRoleKey(): boolean {
    return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function getServiceSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const key = serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!url || !key) {
        throw new Error('Supabase env not configured');
    }
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}