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

interface TimeSlot {
  time: string;
  available: boolean;
  price?: number;
  selected?: boolean;
}

interface BookingPageClientProps {
  turfId: string;
}

export default function BookingPageClient({ turfId }: BookingPageClientProps) {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [dateAvailability, setDateAvailability] = useState<{ [key: string]: { available: boolean, price: number }[] }>({});
  const supabase = createClient();

  // Generate dates for the next 7 days
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Generate time slots from 6 AM to 8 PM
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 20; hour++) {
      const time = hour <= 12
        ? `${hour === 12 ? 12 : hour % 12}:00 ${hour < 12 ? 'AM' : 'PM'}`
        : `${hour % 12}:00 PM`;
      slots.push({
        time,
        available: false, // Will be set per date
        price: 0, // Will be set per date
        selected: false
      });
    }
    return slots;
  };

  // Generate availability and pricing for each date
  const generateDateAvailability = (date: Date) => {
    const availability = [];
    for (let hour = 6; hour <= 20; hour++) {
      // More realistic availability pattern
      const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sunday or Saturday
      const isPeakHour = hour >= 18 || hour <= 8; // Evening and morning hours

      // Higher availability on weekends, lower on weekdays
      const availabilityChance = isWeekend ? 0.7 : 0.5;
      const isAvailable = Math.random() < availabilityChance;

      // Pricing based on time and day
      let price = 0;
      if (isAvailable) {
        if (isWeekend) {
          price = isPeakHour ? 800 : 600;
        } else {
          price = isPeakHour ? 700 : 500;
        }
      }

      availability.push({
        available: isAvailable,
        price: price
      });
    }
    return availability;
  };

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
            name: "Mandar Ranade",
            city: "Mumbai",
            address: "Thakur Public School, Kandivali",
            sport: "badminton",
            price_per_hour: 600,
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
          name: "Mandar Ranade",
          city: "Mumbai",
          address: "Thakur Public School, Kandivali",
          sport: "badminton",
          price_per_hour: 600,
          rating: 4.4,
          rating_count: 39,
          status: "active"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchFacility();
    const slots = generateTimeSlots();
    setTimeSlots(slots);

    // Generate availability for all dates
    const dates = generateDates();
    const availability: { [key: string]: { available: boolean, price: number }[] } = {};
    dates.forEach(date => {
      const dateKey = date.toDateString();
      availability[dateKey] = generateDateAvailability(date);
    });
    setDateAvailability(availability);
  }, [turfId, supabase]);


  const formatDate = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return {
      day: days[date.getDay()],
      date: date.getDate().toString().padStart(2, '0'),
      month: months[date.getMonth()],
      year: date.getFullYear()
    };
  };

  const handleTimeSlotSelect = (time: string, date: Date) => {
    setSelectedTimeSlot(time);
    setSelectedDate(date); // Auto-select the date when a slot is clicked
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading booking options...</div>
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

  const currentDate = formatDate(selectedDate);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href={`/turf/${turfId}`} className="p-2 hover:bg-gray-100 rounded-full">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {facility.name} Badmint...
              </h1>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-600">
                  {currentDate.date} {currentDate.month}, {currentDate.year}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Time Slots Grid */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Time Column */}
          <div className="w-24 bg-gray-50 border-r border-gray-200 flex-shrink-0">
            {/* Empty space for date header alignment */}
            <div className="h-12 border-b border-gray-200"></div>
            {timeSlots.map((slot, index) => (
              <div key={index} className="h-12 flex items-center justify-center border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-gray-600">{slot.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Availability Grid */}
          <div className="flex-1 overflow-x-auto" id="pricing-grid">
            <div className="flex">
              {generateDates().map((date, dateIndex) => {
                const dateKey = date.toDateString();
                const availability = dateAvailability[dateKey] || [];
                const formatted = formatDate(date);
                const isSelected = date.toDateString() === selectedDate.toDateString();

                return (
                  <div key={dateIndex} className="min-w-[80px]">
                    {/* Date Header */}
                    <div
                      className={`w-full h-12 border-b border-gray-200 flex flex-col items-center justify-center text-xs ${isSelected
                          ? 'bg-cyan-100 text-cyan-700'
                          : 'bg-gray-100 text-gray-700'
                        }`}
                    >
                      <span className="font-medium">{formatted.day}</span>
                      <span className="font-semibold">{formatted.date}</span>
                    </div>

                    {/* Time Slots */}
                    {timeSlots.map((slot, timeIndex) => {
                      const slotAvailability = availability[timeIndex] || { available: false, price: 0 };
                      const isAvailable = slotAvailability.available;
                      const price = slotAvailability.price;
                      const isSelected = selectedTimeSlot === slot.time && date.toDateString() === selectedDate.toDateString();

                      return (
                        <button
                          key={`${dateIndex}-${timeIndex}`}
                          onClick={() => isAvailable && handleTimeSlotSelect(slot.time, date)}
                          disabled={!isAvailable}
                          className={`w-full h-12 border-b border-gray-200 flex items-center justify-center text-xs transition-colors ${isSelected
                              ? 'bg-cyan-100 text-cyan-700 border-cyan-200'
                              : isAvailable
                                ? 'bg-pink-50 text-pink-700 hover:bg-pink-100'
                                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                          {isAvailable && price > 0 && (
                            <span className="font-medium">₹ {price}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Next Button */}
      <div className="p-4 pb-20 border-t border-gray-200">
        {selectedTimeSlot && selectedDate ? (
          <a
            href={`/booking-summary/${turfId}?date=${selectedDate.toISOString()}&time=${selectedTimeSlot}&price=${dateAvailability[selectedDate.toDateString()]?.find((slot, index) => timeSlots[index]?.time === selectedTimeSlot)?.price || 800}`}
            className={`w-full py-3 rounded-lg font-semibold transition-colors bg-cyan-500 text-white hover:bg-cyan-600 block text-center`}
          >
            Next
          </a>
        ) : (
          <button
            disabled={true}
            className="w-full py-3 rounded-lg font-semibold transition-colors bg-gray-200 text-gray-400 cursor-not-allowed"
          >
            Next
          </button>
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
          <div className="flex flex-col items-center">
            <span className="text-red-600 font-bold text-xs mb-1">SIMPLIFIT</span>
            <span className="text-xs text-gray-400">Profile</span>
          </div>
        </div>
      </div>
    </div>
  );
}
