"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabaseClient';

interface PointsDisplayProps {
    userId: string;
    className?: string;
}

export default function PointsDisplay({ userId, className = "" }: PointsDisplayProps) {
    const [points, setPoints] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchUserPoints();
    }, [userId, fetchUserPoints]);

    const fetchUserPoints = useCallback(async () => {
        try {
            // Check if userId is valid (not 'anonymous' or empty)
            if (!userId || userId === 'anonymous' || userId === '') {
                console.warn('Invalid user ID, using default points');
                setPoints(0);
                setLoading(false);
                return;
            }

            // Check if points columns exist first
            const { data, error } = await supabase
                .from('profiles')
                .select('points, points_earned, points_spent')
                .eq('user_id', userId)
                .single();

            if (error) {
                // If columns don't exist, set default points
                console.warn('Points columns not found, using default value');
                setPoints(0);
                return;
            }

            setPoints(data?.points || 0);
        } catch (error) {
            console.error('Error fetching points:', error);
            setPoints(0);
        } finally {
            setLoading(false);
        }
    }, [userId, supabase]);

    if (loading) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="w-12 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-2 rounded-full shadow-lg ${className}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-bold text-sm">{points}</span>
        </div>
    );
}
