"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';

interface Booking {
    id: string;
    facility_id: string;
    court_id?: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    total_price: number;
    status: string;
    payment_status: string;
    payment_method?: string;
    notes?: string;
    created_at: string;
    facility_name?: string;
    facility_address?: string;
    sport?: string;
}

export default function PastBookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        fetchPastBookings();
    }, []);

    const fetchPastBookings = async () => {
        try {
            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                setError('Please sign in to view your bookings');
                return;
            }

            // Fetch bookings with facility information
            const { data: bookingsData, error: bookingsError } = await supabase
                .from('bookings')
                .select(`
          *,
          facilities:facility_id (
            name,
            address,
            sport
          )
        `)
                .eq('user_id', user.id)
                .order('booking_date', { ascending: false });

            if (bookingsError) throw bookingsError;

            // Transform the data to include facility information
            const transformedBookings = (bookingsData || []).map(booking => ({
                ...booking,
                facility_name: booking.facilities?.name || 'Unknown Facility',
                facility_address: booking.facilities?.address || 'Unknown Address',
                sport: booking.facilities?.sport || 'Unknown Sport'
            }));

            setBookings(transformedBookings);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setError('Failed to load your bookings');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'text-green-600 bg-green-100';
            case 'completed': return 'text-blue-600 bg-blue-100';
            case 'pending': return 'text-yellow-600 bg-yellow-100';
            case 'cancelled': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'text-green-600 bg-green-100';
            case 'pending': return 'text-yellow-600 bg-yellow-100';
            case 'refunded': return 'text-blue-600 bg-blue-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getSportIcon = (sport: string) => {
        const icons: { [key: string]: string } = {
            cricket: "🏏",
            football: "⚽",
            badminton: "🏸",
            tennis: "🎾",
            "table-tennis": "🏓",
            pickleball: "🏓",
            padel: "🎾",
            squash: "🏓",
            billiards: "🎱",
            basketball: "🏀",
            volleyball: "🏐",
            shooting: "🎯",
        };
        return icons[sport] || "🏆";
    };

    const formatTime = (time: string) => {
        return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-gray-500">Loading your bookings...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 mb-4">{error}</div>
                    <button
                        onClick={() => window.history.back()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="px-4 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.history.back()}
                            className="p-2 hover:bg-gray-100 rounded-full"
                        >
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-lg font-semibold text-gray-900">Past Booking</h1>
                            <p className="text-sm text-gray-600">{bookings.length} bookings found</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bookings List */}
            <div className="px-4 py-6 pb-20">
                {bookings.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">📅</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bookings Yet</h3>
                        <p className="text-gray-600 mb-6">Book your first court to see it here!</p>
                        <a
                            href="/search"
                            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 inline-block"
                        >
                            Book a Court
                        </a>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bookings.map((booking) => (
                            <div key={booking.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl">{getSportIcon(booking.sport)}</div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{booking.facility_name}</h3>
                                            <p className="text-sm text-gray-600">
                                                {new Date(booking.booking_date).toLocaleDateString()} • {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-semibold text-gray-900">₹{booking.total_price}</div>
                                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="text-sm text-gray-600">{booking.facility_address}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.payment_status)}`}>
                                            {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
                                        </div>
                                        {booking.payment_method && (
                                            <span className="text-xs text-gray-500">
                                                via {booking.payment_method}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        Booked {new Date(booking.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                {booking.notes && (
                                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                                        <strong>Note:</strong> {booking.notes}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-20">
                <div className="flex justify-around items-center">
                    <a href="/dashboard" className="flex flex-col items-center">
                        <svg className="w-6 h-6 text-gray-400 mb-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                        <span className="text-xs text-gray-400">Home</span>
                    </a>
                    <a href="/search" className="flex flex-col items-center">
                        <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="text-xs text-gray-400">Search</span>
                    </a>
                    <div className="flex flex-col items-center">
                        <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-xs text-gray-400">Community</span>
                    </div>
                    <a href="/profile" className="flex flex-col items-center">
                        <span className="text-red-600 font-bold text-xs mb-1">SIMPLIFIT</span>
                        <span className="text-xs text-gray-400">Profile</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
