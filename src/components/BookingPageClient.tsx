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
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [dateAvailability, setDateAvailability] = useState<{ [key: string]: { available: boolean, price: number, slot_id?: string, court_id?: string }[] }>({});
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

  // Fetch actual time slots from database
  const fetchTimeSlots = async (facilityId: string): Promise<{ [key: string]: { available: boolean, price: number, slot_id?: string, court_id?: string }[] }> => {
    try {
      // Get all courts for this facility
      const { data: courtsData } = await supabase
        .from('courts')
        .select('id')
        .eq('facility_id', facilityId);

      if (!courtsData || courtsData.length === 0) {
        return {};
      }

      const courtIds = courtsData.map(c => c.id);

      // Get dates for the next 7 days
      const dates = generateDates();
      const dateStrings = dates.map(date => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      });

      // Fetch available time slots for this facility
      const { data: slotsData, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('facility_id', facilityId)
        .in('court_id', courtIds)
        .in('date', dateStrings)
        .eq('is_available', true)
        .eq('is_booked', false)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching time slots:', error);
        return {};
      }

      // Organize slots by date and time, storing slot_id for booking
      const availability: { [key: string]: { available: boolean, price: number, slot_id?: string, court_id?: string }[] } = {};

      dates.forEach((date, dateIndex) => {
        const dateKey = date.toDateString();
        const dateString = dateStrings[dateIndex];

        // Initialize availability array for this date
        availability[dateKey] = [];

        // For each hour slot (6 AM to 8 PM)
        for (let hour = 6; hour <= 20; hour++) {
          // Find matching slot
          const matchingSlot = slotsData?.find(slot => {
            const slotDate = slot.date;
            const slotStartTime = slot.start_time;

            // Check if date matches
            if (slotDate !== dateString) return false;

            // Check if time matches (hour should match start_time)
            const slotHour = parseInt(slotStartTime.split(':')[0]);
            return slotHour === hour;
          });

          if (matchingSlot) {
            availability[dateKey].push({
              available: true,
              price: matchingSlot.price_per_hour,
              slot_id: matchingSlot.id,
              court_id: matchingSlot.court_id
            });
          } else {
            availability[dateKey].push({
              available: false,
              price: 0
            });
          }
        }
      });

      return availability;
    } catch (error) {
      console.error('Error in fetchTimeSlots:', error);
      return {};
    }
  };

  useEffect(() => {
    async function fetchFacility() {
      try {
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
      }
    }

    async function loadData() {
      setLoading(true);
      await fetchFacility();
      const slots = generateTimeSlots();
      setTimeSlots(slots);

      // Fetch actual time slots from database
      const availability = await fetchTimeSlots(turfId);
      setDateAvailability(availability);
      setLoading(false);
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleTimeSlotSelect = (time: string, date: Date, slotIndex: number) => {
    setSelectedTimeSlot(time);
    setSelectedDate(date); // Auto-select the date when a slot is clicked

    // Store slot_id and court_id for the selected slot
    const dateKey = date.toDateString();
    const slotInfo = dateAvailability[dateKey]?.[slotIndex];
    if (slotInfo?.slot_id) {
      setSelectedSlotId(slotInfo.slot_id);
    }
    if (slotInfo?.court_id) {
      setSelectedCourtId(slotInfo.court_id);
    }
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
                          onClick={() => isAvailable && handleTimeSlotSelect(slot.time, date, timeIndex)}
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
        {selectedTimeSlot && selectedDate && selectedSlotId && selectedCourtId ? (
          (() => {
            const dateKey = selectedDate.toDateString();
            const slotIndex = timeSlots.findIndex(slot => slot.time === selectedTimeSlot);
            const slotInfo = dateAvailability[dateKey]?.[slotIndex];
            const price = slotInfo?.price || 800;

            return (
              <a
                href={`/booking-summary/${turfId}?date=${selectedDate.toISOString()}&time=${selectedTimeSlot}&price=${price}&slot_id=${selectedSlotId}&court_id=${selectedCourtId}`}
                className={`w-full py-3 rounded-lg font-semibold transition-colors bg-cyan-500 text-white hover:bg-cyan-600 block text-center`}
              >
                Next
              </a>
            );
          })()
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
