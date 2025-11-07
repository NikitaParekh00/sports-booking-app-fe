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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Auction Banner */}
      {!selectedSport && showAuctionBanner && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 relative">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="text-2xl">🏏</div>
              <div>
                <div className="font-semibold text-sm">Live Auction</div>
                <div className="text-xs opacity-90">Player bidding in progress</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/auction')}
                className="px-4 py-1.5 bg-white text-red-600 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors"
              >
                View
              </button>
              <button
                onClick={() => setShowAuctionBanner(false)}
                className="text-white opacity-70 hover:opacity-100 p-1"
                aria-label="Close banner"
              >
                ✕
              </button>
            </div>
          </div>
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
