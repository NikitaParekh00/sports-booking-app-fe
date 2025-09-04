"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

interface Facility {
  id: string;
  name: string;
  city: string;
  address: string;
  latitude?: number;
  longitude?: number;
  sport: string;
  price_per_hour: number;
  description?: string;
  images?: string[];
  phone?: string;
  email?: string;
  status: string;
  distance?: number;
  courts?: Court[];
}

interface Court {
  id: string;
  name: string;
  facility_id: string;
  capacity?: number;
  amenities?: string[];
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("Rajendra Nagar");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const supabase = createClient();
  
  const locations = [
    "Rajendra Nagar",
    "Koramangala",
    "Indiranagar", 
    "Whitefield",
    "Electronic City",
    "Marathahalli",
    "HSR Layout",
    "JP Nagar",
    "Borivali",
    "Andheri",
    "Bandra",
    "Powai",
    "Malad",
    "Goregaon"
  ];

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    setShowLocationDropdown(false);
  };

  useEffect(() => {
    // Get sport and location from URL parameters
    const sport = searchParams.get('sport');
    const location = searchParams.get('location');
    setSelectedSport(sport);
    if (location) {
      setSelectedLocation(location);
    }

    async function fetchFacilities() {
      try {
        setLoading(true);
        
        // Build query with sport filter if provided
        let query = supabase.from('facilities').select('*');
        
        if (sport) {
          query = query.eq('sport', sport);
        }
        
        const { data, error } = await query.limit(10);

        if (error) {
          console.error('Error fetching facilities:', error);
          return;
        }

        if (data) {
          // Calculate distances (mock calculation for now)
          const facilitiesWithDistance = data.map((facility: Facility) => ({
            ...facility,
            distance: Math.random() * 5 + 0.5 // Random distance between 0.5-5.5 km
          }));
          
          setFacilities(facilitiesWithDistance);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchFacilities();
  }, [searchParams, supabase]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-black px-4 py-6 relative overflow-hidden">
        {/* Animated Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/5 to-pink-500/10"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-400/20 to-purple-600/20 rounded-full blur-3xl transform translate-x-16 -translate-y-16"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-400/15 to-cyan-500/15 rounded-full blur-2xl transform -translate-x-8 translate-y-8"></div>
        
        {/* User Profile and Notification */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full flex items-center justify-center shadow-2xl border-2 border-white/20">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Nikita</h2>
            </div>
          </div>
          <div className="relative">
            <div className="p-2 bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
              </svg>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-pink-500 to-red-500 rounded-full border-2 border-slate-900"></div>
          </div>
        </div>

        {/* Location Section */}
        <div className="flex items-center gap-2 relative z-10">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
          </svg>
          <span className="text-white font-medium text-sm">{selectedLocation}</span>
          <button 
            onClick={() => setShowLocationDropdown(!showLocationDropdown)}
            className="hover:opacity-80 transition-opacity"
          >
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
          
          {/* Location Dropdown */}
          {showLocationDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
              <div className="py-2">
                {locations.map((location) => (
                  <button
                    key={location}
                    onClick={() => handleLocationSelect(location)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                      location === selectedLocation ? 'bg-cyan-50 text-cyan-600 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    {location}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Search and Availability Section */}
      <div className="px-4 py-4 bg-white rounded-t-3xl -mt-4 relative z-10">
        <div className="flex gap-3 mb-4">
          {selectedSport && (
            <a 
              href="/dashboard" 
              className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
            </a>
          )}
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              placeholder={selectedSport ? `Search ${selectedSport} venues...` : "Pick a Sport (Football, Cricket...)"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-900 placeholder-gray-500"
            />
          </div>
          <button className="px-4 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
            </svg>
            Availability
          </button>
        </div>

        {/* Filter Categories */}
        <div className="flex gap-2 overflow-x-auto mb-6 scrollbar-hide">
          <button className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Filter
          </button>
          <button className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded-full text-sm font-medium whitespace-nowrap">
            All
          </button>
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-full text-sm font-medium whitespace-nowrap">
            Venues
          </button>
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-full text-sm font-medium whitespace-nowrap">
            Groups
          </button>
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-full text-sm font-medium whitespace-nowrap">
            Games
          </button>
        </div>
      </div>

      {/* ALL VENUES Section */}
      <div className="px-4 pb-24">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedSport ? `${selectedSport.toUpperCase()} VENUES` : "ALL VENUES"}
            </h2>
            <button className="text-cyan-600 text-sm font-medium">See All</button>
          </div>
          
          {/* Venue Cards */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-gray-500">Loading venues...</div>
              </div>
            ) : facilities.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-gray-500">No venues found</div>
              </div>
            ) : (
              facilities.map((facility) => (
                <a key={facility.id} href={`/turf/${facility.id}`} className="block">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0">
                        <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs font-bold">TURF</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900 text-sm">{facility.name}</h3>
                          <div className="flex items-center gap-1 bg-blue-900 text-yellow-400 px-2 py-1 rounded text-xs">
                            <span>-</span>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                          </svg>
                          <span className="text-gray-600 text-sm">{facility.city}</span>
                          <span className="text-gray-400 text-xs">•</span>
                          <span className="text-gray-500 text-xs">{facility.distance?.toFixed(1)} km away</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-lg font-bold text-gray-900">₹ {facility.price_per_hour}</div>
                            <div className="text-xs text-gray-500">Onwards</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center">
                                <span className="text-orange-600 text-xs">🏏</span>
                              </div>
                              <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                                <span className="text-gray-600 text-xs">⚽</span>
                              </div>
                            </div>
                            <button className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 transition-colors">
                              Book
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>

        {/* ALL GAMES Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">ALL GAMES</h2>
            <button className="text-cyan-600 text-sm font-medium">See All</button>
          </div>
          {/* Games content would go here */}
        </div>
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
          <div className="flex flex-col items-center">
            <svg className="w-6 h-6 text-red-600 mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
            </svg>
            <span className="text-xs text-red-600 font-medium">Search</span>
            <div className="w-6 h-0.5 bg-red-600 mt-1"></div>
          </div>
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
    </div>
  );
}

export default function SearchPageClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
