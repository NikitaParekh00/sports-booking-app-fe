"use client";

import { useState, useEffect } from "react";
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

interface BookingSummaryClientProps {
  turfId: string;
  selectedDate?: string;
  selectedTime?: string;
  selectedPrice?: string;
}

export default function BookingSummaryClient({ 
  turfId, 
  selectedDate, 
  selectedTime, 
  selectedPrice 
}: BookingSummaryClientProps) {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [showSlotDetails, setShowSlotDetails] = useState(true);
  const supabase = createClient();

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
  const totalPrice = price * quantity;

  useEffect(() => {
    async function fetchFacility() {
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

    fetchFacility();
  }, [turfId, supabase]);

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
        <div className="text-gray-500">Loading booking details...</div>
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
          <a href={`/booking/${turfId}`} className="p-2 hover:bg-gray-100 rounded-full">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <h1 className="text-lg font-semibold text-gray-900">Booking Summary</h1>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="mx-4 mt-4 p-4 bg-cyan-50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Terms & Conditions</h3>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
            </svg>
            <p className="text-xs text-gray-700">Non- Marking shoes are COMPULSORY while entering the badminton facilities.</p>
          </div>
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
            </svg>
            <p className="text-xs text-gray-700">Maximum 6 players are allowed per court per slot.</p>
          </div>
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
            </svg>
            <p className="text-xs text-gray-700">Court 2 and Court 5 have basketball rings on one side which can cause slight inconvenience.</p>
          </div>
        </div>
      </div>

      {/* Selected Slot Details */}
      <div className="mx-4 mt-4">
        <button 
          onClick={() => setShowSlotDetails(!showSlotDetails)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg"
        >
          <span className="font-semibold text-gray-900">1 NEW SLOT(S)</span>
          <svg className={`w-5 h-5 text-gray-500 transition-transform ${showSlotDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/>
          </svg>
        </button>

        {showSlotDetails && (
          <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-cyan-600 font-semibold">Court 1</h4>
                <p className="text-sm text-gray-600">{formatDate(selectedDate)}</p>
                <p className="text-sm text-gray-600">{timeSlot.start} - {timeSlot.end}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4"/>
                    </svg>
                  </button>
                  <span className="w-8 text-center font-semibold">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                  </button>
                </div>
                <p className="text-lg font-bold text-gray-900">₹ {price}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Booking User */}
      <div className="mx-4 mt-4 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Booking User</h3>
            <p className="text-sm text-gray-600 mt-1">Nikita Parekh</p>
          </div>
          <button className="text-cyan-600 text-sm font-medium">Change</button>
        </div>
      </div>

      {/* Apply Coupon */}
      <div className="mx-4 mt-4 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-gray-900">Apply coupon</span>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="mx-4 mt-4 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-900">Payable Now</span>
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900">₹ {totalPrice}</span>
        </div>
      </div>

      {/* Policy Links */}
      <div className="mx-4 mt-4 mb-32 flex gap-6">
        <a href="#" className="text-cyan-600 text-sm">Cancellation Policy</a>
        <a href="#" className="text-cyan-600 text-sm">Reschedule Policy</a>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-20">
        <div className="flex justify-around items-center">
          <a href="/dashboard" className="flex flex-col items-center">
            <svg className="w-6 h-6 text-gray-400 mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
            </svg>
            <span className="text-xs text-gray-400">Home</span>
          </a>
          <a href="/search" className="flex flex-col items-center">
            <svg className="w-6 h-6 text-gray-400 mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
            </svg>
            <span className="text-xs text-gray-400">Search</span>
          </a>
          <div className="flex flex-col items-center">
            <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <span className="text-xs text-gray-400">Community</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-red-600 font-bold text-xs mb-1">SIMPLIFIT</span>
            <span className="text-xs text-gray-400">Profile</span>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-16 left-0 right-0 bg-cyan-500 px-4 py-4 z-30">
        <div className="flex items-center justify-between">
          <div className="text-white">
            <p className="text-lg font-bold">₹ {totalPrice}</p>
            <p className="text-sm opacity-90">{quantity} Slot(s) selected</p>
          </div>
          <a
            href={`/booking-success/${turfId}?date=${selectedDate}&time=${selectedTime}&price=${selectedPrice}&quantity=${quantity}`}
            className="bg-cyan-400 text-white px-8 py-3 rounded-lg font-semibold hover:bg-cyan-300 transition-colors inline-block"
          >
            PROCEED
          </a>
        </div>
      </div>
    </div>
  );
}
