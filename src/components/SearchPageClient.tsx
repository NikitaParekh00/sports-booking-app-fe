"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
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
  const [filteredFacilities, setFilteredFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [user, setUser] = useState<{ user_id: string; full_name: string; email: string } | null>(null);
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

  // Filter facilities based on search query
  const filterFacilities = (query: string) => {
    if (!query.trim()) {
      setFilteredFacilities(facilities);
      return;
    }

    const filtered = facilities.filter((facility) => {
      const searchTerm = query.toLowerCase();
      return (
        facility.sport.toLowerCase().includes(searchTerm) ||
        facility.name.toLowerCase().includes(searchTerm) ||
        facility.city.toLowerCase().includes(searchTerm) ||
        facility.address.toLowerCase().includes(searchTerm)
      );
    });

    setFilteredFacilities(filtered);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    filterFacilities(value);
  };

  // Fetch user data from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('sf:user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

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
          setFilteredFacilities(facilitiesWithDistance);
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
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Hi, {user?.full_name || "Player"} 👋</h2>
            <div className="flex items-center gap-1 text-gray-600 mt-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{selectedLocation.split(' ').slice(0, 4).join(' ')}</span>
              <button
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="ml-1 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            {showLocationDropdown && (
              <div className="mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
                <div className="py-2">
                  {locations.map((location) => (
                    <button
                      key={location}
                      onClick={() => handleLocationSelect(location)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${location === selectedLocation ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-700'}`}
                    >
                      {location}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-gray-600 font-semibold text-sm">{(user?.full_name || 'P').charAt(0)}</span>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="px-4 pb-4">
        <div className="flex gap-3 mb-4">
          {selectedSport && (
            <a
              href="/dashboard"
              className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
          )}
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={selectedSport ? `Search ${selectedSport} venues...` : "Search sports (Football, Badminton, Cricket...)"}
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-4 bg-gray-100 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 placeholder-gray-500"
            />
          </div>
        </div>

      </div>

      {/* ALL VENUES Section */}
      <div className="px-4 pb-24">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {searchQuery ? `SEARCH RESULTS` : selectedSport ? `${selectedSport.toUpperCase()} VENUES` : "ALL VENUES"}
            </h2>
            <button className="text-cyan-600 text-sm font-medium">See All</button>
          </div>

          {/* Venue Cards */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-gray-500">Loading venues...</div>
              </div>
            ) : filteredFacilities.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-gray-500">
                  {searchQuery ? `No venues found for "${searchQuery}"` : "No venues found"}
                </div>
              </div>
            ) : (
              filteredFacilities.map((facility) => (
                <a key={facility.id} href={`/turf/${facility.id}`} className="block">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                        <Image
                          src="https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=80&h=80&fit=crop&crop=center"
                          alt={facility.name}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                        <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center hidden">
                          <span className="text-white text-xs font-bold">TURF</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900 text-sm">{facility.name}</h3>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
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
                            <button className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors shadow-lg">
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
          <div className="flex flex-col items-center">
            <svg className="w-6 h-6 text-red-600 mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-red-600 font-medium">Search</span>
            <div className="w-6 h-0.5 bg-red-600 mt-1"></div>
          </div>
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
