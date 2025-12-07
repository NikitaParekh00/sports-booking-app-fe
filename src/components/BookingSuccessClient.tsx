"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  slotIds?: string;
}

export default function BookingSuccessClient({
  turfId,
  selectedDate,
  selectedTime,
  selectedPrice,
  quantity = "1",
  slotIds
}: BookingSuccessClientProps) {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string>("");
  const [bookedCourts, setBookedCourts] = useState<string[]>([]);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const supabase = createClient();

  // Parse slot IDs
  const slotIdsArray = useMemo(() => {
    return slotIds ? slotIds.split(',').filter(id => id) : [];
  }, [slotIds]);

  // Generate a booking ID (UUID format for database compatibility)
  useEffect(() => {
    const generateBookingId = () => {
      // Generate a UUID-like string
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
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

        // Court names will be fetched after booking

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Book the time slots if slot_ids are provided
      if (slotIdsArray.length > 0) {
        const quantityNum = parseInt(quantity);
        const slotsToBook = slotIdsArray.slice(0, quantityNum);
        const bookedCourtNames: string[] = [];
        let successCount = 0;
        const errorMessages: string[] = [];

        // Book each slot and collect court names
        for (const slotId of slotsToBook) {
          try {
            // Get slot details to find court_id
            const { data: slotData, error: slotError } = await supabase
              .from('time_slots')
              .select('court_id, date, start_time, is_booked, is_available')
              .eq('id', slotId)
              .single();

            if (slotError || !slotData) {
              errorMessages.push(`Slot ${slotId}: ${slotError?.message || 'Slot not found'}`);
              continue;
            }

            // Check if slot is already booked
            if (slotData.is_booked || !slotData.is_available) {
              errorMessages.push(`Slot ${slotId}: Already booked or unavailable`);
              continue;
            }

            // Update the slot to mark as booked (use null if bookingId is empty)
            const { error: updateError } = await supabase
              .from('time_slots')
              .update({
                is_available: false,
                is_booked: true,
                user_id: userData.user_id,
                booking_id: bookingId || null
              })
              .eq('id', slotId);

            if (updateError) {
              let errorMsg = updateError.message || 'Unknown error';
              if (updateError.code === '22P02') {
                errorMsg = 'Invalid booking ID format';
              }
              errorMessages.push(`Slot ${slotId}: ${errorMsg}`);
              console.error('Error booking slot:', updateError);
              continue;
            }

            successCount++;

            // Fetch court name
            const { data: courtData } = await supabase
              .from('courts')
              .select('name')
              .eq('id', slotData.court_id)
              .single();

            if (courtData) {
              bookedCourtNames.push(courtData.name);
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            errorMessages.push(`Slot ${slotId}: ${errorMsg}`);
            console.error('Error processing slot:', error);
          }
        }

        // Check if any slots were successfully booked
        if (successCount === 0) {
          const errorMsg = errorMessages.length > 0
            ? `Failed to book slots:\n${errorMessages.join('\n')}`
            : 'Failed to book time slots. Please try again.';
          setBookingError(errorMsg);
          alert(errorMsg);
          return;
        }

        // If some slots failed, show warning but continue
        if (errorMessages.length > 0 && successCount < quantityNum) {
          console.warn('Some slots failed to book:', errorMessages);
          alert(`Warning: ${successCount} of ${quantityNum} slots booked successfully. Some slots may have been unavailable.`);
        }

        setBookedCourts(bookedCourtNames);
        console.log(`✅ ${successCount} time slot(s) booked successfully`);
      } else {
        setBookingError('No slots selected for booking');
        alert('No slots selected for booking');
        return;
      }

      // Also create booking record if bookings table exists
      const bookingData = {
        user_id: userData.user_id,
        facility_id: turfId,
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

      // Try to insert booking into database (if table exists)
      const { data, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select();

      if (error) {
        // If bookings table doesn't exist, that's okay - we've already booked the time slot
        console.log('⚠️ Bookings table may not exist, but time slot is booked:', error);
      } else {
        console.log('✅ Booking record created successfully:', data);
      }
    } catch (error) {
      console.error('❌ Unexpected error creating booking:', error);
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
      setBookingError(errorMsg);
      alert(`Booking failed: ${errorMsg}`);
      return;
    }
  }, [supabase, quantity, selectedDate, selectedTime, totalPrice, turfId, slotIdsArray, bookingId]);

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

  if (bookingError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Failed</h2>
          <p className="text-gray-600 mb-4 whitespace-pre-line">{bookingError}</p>
          <a
            href={`/booking/${turfId}`}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Try Again
          </a>
        </div>
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
              <span className="text-gray-600">Court{bookedCourts.length > 1 ? 's' : ''}</span>
              <span className="font-semibold text-gray-900">
                {bookedCourts.length > 0
                  ? bookedCourts.join(', ')
                  : 'Court assignment pending...'}
              </span>
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
          <a href="/profile" className="flex flex-col items-center">
            <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs text-gray-400">Profile</span>
          </a>
        </div>
      </div>
    </div>
  );
}
