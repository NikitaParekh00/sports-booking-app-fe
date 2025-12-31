"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import LocationInput from "@/components/LocationInput";
import BottomSheet from "@/components/BottomSheet";
import SportsSelection from "@/components/SportsSelection";
import TurfListing from "@/components/TurfListing";

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Location {
  lat: number;
  lng: number;
  address: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("Rajendra Nagar");
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState<boolean>(false);
  const [showAuctionBanner, setShowAuctionBanner] = useState(true);
  const [auctionSessions, setAuctionSessions] = useState<Array<{ id: string; session_name: string; is_complete: boolean }>>([]);

  const handleLocationChange = (location: string) => {
    console.log('Dashboard received location change:', location);
    setSelectedLocation(location);
  };
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      // For development: Get user from localStorage (set during OTP verification)
      const storedUser = localStorage.getItem('sf:user');
      console.log('Stored user from localStorage:', storedUser);

      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          console.log('Parsed user data:', userData);
          setUser({
            id: userData.user_id,
            full_name: userData.full_name,
            email: userData.email || ''
          });
        } catch (error) {
          console.error('Error parsing stored user:', error);
          setUser(null);
        }
      } else {
        console.log('No stored user found, trying Supabase auth...');
        // Fallback: Try to get from Supabase auth (for production)
        const { data: { user: authUser } } = await supabase.auth.getUser();
        console.log('Supabase auth user:', authUser);

        if (authUser) {
          // Get user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', authUser.id)
            .single();

          console.log('User profile from database:', profile);
          setUser({
            id: authUser.id,
            full_name: profile?.full_name || authUser.email?.split('@')[0] || 'User',
            email: authUser.email || ''
          });
        } else {
          console.log('No authenticated user found');
          // No user found
          setUser(null);
        }
      }
      setLoading(false);
    }

    getUser();
  }, [supabase]);

  // Load saved location from localStorage and auto-open sheet on first load if not set
  useEffect(() => {
    try {
      const savedLoc = window.localStorage.getItem("sf:selectedLocation");
      const savedLocObj = window.localStorage.getItem("sf:selectedLocationObj");
      if (savedLoc && savedLocObj) {
        setSelectedLocation(savedLoc);
        const obj = JSON.parse(savedLocObj) as Location;
        setLocation(obj);
      } else {
        setIsLocationSheetOpen(true);
      }
    } catch {
      // ignore
      setIsLocationSheetOpen(true);
    }
  }, []);

  // Fetch all active auction sessions
  useEffect(() => {
    async function fetchAuctionSessions() {
      try {
        const { data, error } = await supabase
          .from('auction_sessions')
          .select('id, session_name, is_complete')
          .eq('is_complete', false) // Only show active (incomplete) sessions
          .order('created_at', { ascending: false }); // Show newest first

        if (error) {
          console.error('Error fetching auction sessions:', error);
          return;
        }

        if (data) {
          console.log('Fetched auction sessions:', data);
          setAuctionSessions(data);
        } else {
          console.log('No active auction sessions found');
        }
      } catch (error) {
        console.error('Error fetching auction sessions:', error);
      }
    }

    fetchAuctionSessions();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Auction Banners - Show Men's and Women's auctions separately */}
      {!selectedSport && showAuctionBanner && auctionSessions.length > 0 && (
        <div className="space-y-2 px-4 py-2">
          {auctionSessions.map((session) => {
            const isMen = session.session_name.toLowerCase().includes('men');
            const isWomen = session.session_name.toLowerCase().includes('women');
            const isComplete = session.is_complete;

            // Format session name for display (remove "MBBL" prefix if already in name, or add it)
            let displayName = session.session_name;

            return (
              <div
                key={session.id}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 rounded-lg relative"
              >
                <div className="max-w-md mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-2xl">🏏</div>
                    <div>
                      <div className="font-semibold text-sm">
                        {displayName}
                      </div>
                      <div className="text-xs opacity-90">
                        {isComplete ? "Auction Complete" : "Player bidding in progress"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/auction?session=${session.id}`)}
                      className="px-4 py-1.5 bg-white text-red-600 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors"
                    >
                      View
                    </button>
                    {auctionSessions.length === 1 && (
                      <button
                        onClick={() => setShowAuctionBanner(false)}
                        className="text-white opacity-70 hover:opacity-100 p-1"
                        aria-label="Close banner"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {auctionSessions.length > 1 && (
            <button
              onClick={() => setShowAuctionBanner(false)}
              className="text-gray-500 text-xs px-4 py-1 hover:text-gray-700"
              aria-label="Close banners"
            >
              Hide auctions
            </button>
          )}
        </div>
      )}

      {/* Sports Selection - always visible. Location sheet pops over if not set */}
      {!selectedSport && (
        <SportsSelection
          selectedLocation={selectedLocation || "Current Location"}
          onLocationChange={handleLocationChange}
          onRequestLocationChange={() => setIsLocationSheetOpen(true)}
          userName={user?.full_name}
          userId={user?.id || null}
        />
      )}

      {/* Turf Listing */}
      {location && selectedSport && (
        <div className="px-4 pb-20">
          <TurfListing
            location={location}
            sport={selectedSport}
            onBack={() => setSelectedSport(null)}
          />
        </div>
      )}

      {/* Bottom Sheet for Location Selection */}
      <BottomSheet
        isOpen={isLocationSheetOpen}
        onClose={() => setIsLocationSheetOpen(false)}
        title="Select Location"
      >
        <LocationInput
          onLocationSet={(loc, locationName) => {
            setLocation(loc);
            setSelectedLocation(locationName);
            setIsLocationSheetOpen(false);
            try {
              window.localStorage.setItem("sf:selectedLocation", locationName);
              window.localStorage.setItem("sf:selectedLocationObj", JSON.stringify(loc));
            } catch { }
          }}
        />
      </BottomSheet>
    </div>
  );
}
