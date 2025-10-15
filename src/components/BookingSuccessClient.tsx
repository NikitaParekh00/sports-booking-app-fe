"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabaseClient";

interface Facility {
  id: string;
  name: string;
  city: string;
  address: string;
  sport: string;
  price_per_hour: number;
  description?: string;
  images?: string[];
  phone?: string;
  email?: string;
  status: string;
  rating?: number;
  rating_count?: number;
}

interface BookingSuccessClientProps {
  turfId: string;
  selectedDate?: string;
  selectedTime?: string;
  selectedPrice?: string;
  quantity?: string;
}

export default function BookingSuccessClient({
  turfId,
  selectedDate,
  selectedTime,
  selectedPrice,
  quantity = "1"
}: BookingSuccessClientProps) {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string>("");
  const supabase = createClient();

  // Generate a booking ID
  useEffect(() => {
    const generateBookingId = () => {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 5);
      return `BK${timestamp}${random}`.toUpperCase();
    };
    setBookingId(generateBookingId());
  }, []);

  // Parse the selected time to get start and end times
  const parseTimeSlot = (time: string) => {
    if (!time) return { start: "8:00 PM", end: "9:00 PM" };

    const hour = parseInt(time.split(':')[0]);
    const period = time.includes('AM') ? 'AM' : 'PM';
    const displayHour = hour === 12 ? 12 : hour % 12;
    const startTime = `${displayHour}:00 ${period}`;
    const endHour = hour === 11 ? 12 : (hour + 1) % 12;
    const endPeriod = hour === 11 ? (period === 'AM' ? 'PM' : 'AM') : period;
    const endTime = `${endHour}:00 ${endPeriod}`;

    return { start: startTime, end: endTime };
  };

  const timeSlot = parseTimeSlot(selectedTime || "8:00 PM");
  const price = selectedPrice ? parseInt(selectedPrice) : 800;
  const totalPrice = price * parseInt(quantity);

  useEffect(() => {
    async function fetchFacilityAndCreateBooking() {
      try {
        setLoading(true);

        // Try to fetch from database first
        const { data, error } = await supabase
          .from('facilities')
          .select('*')
          .eq('id', turfId)
          .single();

        if (error || !data) {
          // Fallback to mock data
          setFacility({
            id: turfId,
            name: "Malad Racquet Club",
            city: "Mumbai",
            address: "Malad West, Mumbai",
            sport: "badminton",
            price_per_hour: 800,
            rating: 4.4,
            rating_count: 39,
            status: "active"
          });
        } else {
          setFacility(data);
        }

        // Create booking in database
        await createBooking();

      } catch (error) {
        console.error('Error fetching facility:', error);
        setFacility({
          id: turfId,
          name: "Malad Racquet Club",
          city: "Mumbai",
          address: "Malad West, Mumbai",
          sport: "badminton",
          price_per_hour: 800,
          rating: 4.4,
          rating_count: 39,
          status: "active"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchFacilityAndCreateBooking();
  }, [turfId, supabase]);

  const createBooking = useCallback(async () => {
    try {
      console.log('🚀 Creating booking...');

      // Get user from localStorage
      const storedUser = localStorage.getItem('sf:user');
      if (!storedUser) {
        console.error('❌ No user found in localStorage');
        return;
      }

      const userData = JSON.parse(storedUser);
      console.log('👤 User data:', userData);

      // Parse booking data
      const bookingDate = selectedDate ? new Date(selectedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const timeSlot = parseTimeSlot(selectedTime || "8:00 PM");

      // Convert time to 24-hour format for database
      const startTime24 = convertTo24Hour(timeSlot.start);
      const endTime24 = convertTo24Hour(timeSlot.end);

      const bookingData = {
        user_id: userData.user_id,
        facility_id: turfId,
        court_id: turfId, // Use facility_id as court_id for now (since we don't have separate courts)
        booking_date: bookingDate,
        start_time: startTime24,
        end_time: endTime24,
        total_price: totalPrice,
        status: 'confirmed',
        payment_status: 'paid',
        payment_method: 'card',
        notes: `Booking for ${quantity} slot(s)`
      };

      console.log('📝 Booking data:', bookingData);

      // Insert booking into database
      const { data, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select();

      if (error) {
        console.error('❌ Error creating booking:', error);
        alert('Failed to create booking. Please try again.');
      } else {
        console.log('✅ Booking created successfully:', data);
      }
    } catch (error) {
      console.error('❌ Unexpected error creating booking:', error);
    }
  }, [supabase, quantity, selectedDate, selectedTime, totalPrice, turfId]);

  const convertTo24Hour = (time12: string) => {
    const [time, period] = time12.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);

    if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    }

    return `${hour24.toString().padStart(2, '0')}:${minutes}:00`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Sep 6, 2025";

    try {
      const date = new Date(dateString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    } catch {
      return "Sep 6, 2025";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Processing booking...</div>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Facility not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <h1 className="text-lg font-semibold text-gray-900">Booking Confirmation</h1>
        </div>
      </div>

      {/* Success Message */}
      <div className="px-4 py-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Slot Booked Successfully!</h2>
        <p className="text-gray-600 mb-4">Your booking has been confirmed. You will receive a confirmation email shortly.</p>
        <div className="bg-gray-100 rounded-lg p-3 inline-block">
          <p className="text-sm text-gray-600">Booking ID: <span className="font-semibold text-gray-900">{bookingId}</span></p>
        </div>
      </div>

      {/* Booking Details */}
      <div className="px-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Booking Details</h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Facility</span>
              <span className="font-semibold text-gray-900">{facility.name}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Court</span>
              <span className="font-semibold text-gray-900">Court 1</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Date</span>
              <span className="font-semibold text-gray-900">{formatDate(selectedDate)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Time</span>
              <span className="font-semibold text-gray-900">{timeSlot.start} - {timeSlot.end}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Quantity</span>
              <span className="font-semibold text-gray-900">{quantity} Slot(s)</span>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Amount</span>
                <span className="text-lg font-bold text-gray-900">₹ {totalPrice}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="px-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-2">Important Notes</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Please arrive 10 minutes before your scheduled time</li>
            <li>• Non-marking shoes are compulsory</li>
            <li>• Bring a valid ID for verification</li>
            <li>• Cancellation is allowed up to 2 hours before booking</li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 mb-32 space-y-3">
        <a
          href="/dashboard"
          className="w-full bg-cyan-500 text-white py-3 rounded-lg font-semibold text-center block hover:bg-cyan-600 transition-colors"
        >
          Book Another Slot
        </a>

        <a
          href="/search"
          className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold text-center block hover:bg-gray-50 transition-colors"
        >
          Explore More Venues
        </a>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-20">
        <div className="flex justify-around items-center">
          <a href="/dashboard" className="flex flex-col items-center">
            <svg className="w-6 h-6 text-cyan-600 mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="text-xs text-cyan-600 font-medium">Home</span>
          </a>
          <a href="/search" className="flex flex-col items-center">
            <svg className="w-6 h-6 text-gray-400 mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
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
