"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import LocationInput from "@/components/LocationInput";
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
  const [user, setUser] = useState<User | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .single();
        
        setUser({
          id: authUser.id,
          full_name: profile?.full_name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email || ''
        });
      } else {
        // Set a default user for anonymous users
        setUser({
          id: 'anonymous',
          full_name: 'Guest',
          email: ''
        });
      }
      setLoading(false);
    }

    getUser();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Greeting */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
        <h1 className="text-2xl font-semibold text-gray-900">
          {user.id === 'anonymous' ? 'Welcome to Simplifit! 👋' : `Hi, ${user.full_name}! 👋`}
        </h1>
        <p className="text-gray-600 mt-1">
          {user.id === 'anonymous' 
            ? 'Find and book sports facilities near you. No account required to browse!'
            : 'Ready to book your next game? Let\'s find the perfect court for you.'
          }
        </p>
        {user.id === 'anonymous' && (
          <div className="mt-3">
            <a 
              href="/login" 
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Sign in for a personalized experience
            </a>
          </div>
        )}
      </div>

      {/* Location Input */}
      {!location && (
        <LocationInput onLocationSet={setLocation} />
      )}

      {/* Sports Selection */}
      {location && !selectedSport && (
        <SportsSelection onSportSelect={setSelectedSport} />
      )}

      {/* Turf Listing */}
      {location && selectedSport && (
        <TurfListing 
          location={location} 
          sport={selectedSport}
          onBack={() => setSelectedSport(null)}
        />
      )}
    </div>
  );
}
