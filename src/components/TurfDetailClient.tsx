"use client";

import { useState, useEffect } from "react";
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
  rating?: number;
  rating_count?: number;
  amenities?: string[];
  metro_station?: string;
  metro_distance?: number;
  courts?: Court[];
}

interface Court {
  id: string;
  name: string;
  facility_id: string;
  capacity?: number;
  amenities?: string[];
}

interface TurfDetailClientProps {
  turfId: string;
}

export default function TurfDetailClient({ turfId }: TurfDetailClientProps) {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Mock data for demonstration - replace with actual data fetching
    const mockFacility: Facility = {
      id: turfId,
      name: "Mandar Ranade",
      city: "Mumbai",
      address: "Thakur Public School (Secondary), 1st Floor, Near Saraswat Bank, Thakur Village, Kandivali East, Mumbai 400101",
      sport: "badminton",
      price_per_hour: 600,
      description: "A 6 wooden court badminton facility located in Thakur Public School, Kandivali. This one of a kind venue will surely provide you with an amazing badminton experience. The facility is well-maintained with professional-grade courts and excellent lighting.",
      images: [
        "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=300&fit=crop&crop=center",
        "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=300&fit=crop&crop=center",
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center",
        "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=400&h=300&fit=crop&crop=center",
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center"
      ],
      rating: 4.4,
      rating_count: 39,
      amenities: ["Drinking Water", "Parking", "Coaching Available", "Flood Lights", "Washroom"],
      metro_station: "Poisar",
      metro_distance: 1.6,
      phone: "+91 98765 43210",
      email: "info@mandarranade.com",
      status: "active"
    };

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
          setFacility(mockFacility);
        } else {
          setFacility({
            ...data,
            rating: data.rating || 4.4,
            rating_count: data.rating_count || 39,
            amenities: data.amenities || ["Drinking Water", "Parking", "Coaching Available", "Flood Lights", "Washroom"],
            metro_station: data.metro_station || "Poisar",
            metro_distance: data.metro_distance || 1.6
          });
        }
      } catch (error) {
        console.error('Error fetching facility:', error);
        setFacility(mockFacility);
      } finally {
        setLoading(false);
      }
    }

    fetchFacility();
  }, [turfId, supabase]);

  const nextImage = () => {
    if (facility?.images) {
      setCurrentImageIndex((prev) => (prev + 1) % facility.images!.length);
    }
  };

  const prevImage = () => {
    if (facility?.images) {
      setCurrentImageIndex((prev) => (prev - 1 + facility.images!.length) % facility.images!.length);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading facility details...</div>
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
      {/* Image Carousel */}
      <div className="relative">
        <div className="aspect-[4/3] bg-gray-200 relative overflow-hidden">
          <Image
            src={facility.images?.[currentImageIndex] || "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=300&fit=crop&crop=center"}
            alt={facility.name}
            width={400}
            height={300}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=300&fit=crop&crop=center";
            }}
          />


          {/* Image Counter */}
          <div className="absolute bottom-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
            {currentImageIndex + 1}/{facility.images?.length || 1}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevImage}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={nextImage}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Share Button */}
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Facility Information */}
      <div className="px-4 py-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{facility.name}</h1>
            <h2 className="text-lg text-gray-700">{facility.sport.charAt(0).toUpperCase() + facility.sport.slice(1)} Academy</h2>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-sm text-gray-600">({facility.rating_count} ratings)</span>
              <span className="text-lg font-semibold text-gray-900">{facility.rating}</span>
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏸</span>
            <span className="text-sm text-gray-600">Badminton</span>
          </div>
          <button className="text-cyan-600 text-sm font-medium">Equipment Rental</button>
        </div>
      </div>

      {/* Booking Section */}
      <div className="px-4 pb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-3">BOOK A SLOT</h3>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h4 className="font-semibold text-gray-900">{facility.sport.charAt(0).toUpperCase() + facility.sport.slice(1)} (Wooden)</h4>
              <p className="text-sm text-gray-600">Professional grade courts</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">₹ {facility.price_per_hour}</div>
              <div className="text-xs text-gray-500">onwards</div>
            </div>
          </div>
          <a
            href={`/booking/${facility.id}`}
            className="block w-full bg-cyan-500 text-white py-3 rounded-lg font-semibold hover:bg-cyan-600 transition-colors text-center"
          >
            BOOK
          </a>
        </div>
      </div>

      {/* Detailed Information Sections */}
      <div className="px-4 pb-24">
        {/* Description */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-blue-900 mb-2">DESCRIPTION</h3>
          <p className="text-gray-700 text-sm leading-relaxed">
            {showFullDescription ? facility.description : facility.description?.substring(0, 100) + "..."}
          </p>
          {facility.description && facility.description.length > 100 && (
            <button
              onClick={() => setShowFullDescription(!showFullDescription)}
              className="text-cyan-600 text-sm mt-1"
            >
              {showFullDescription ? "Show Less" : "See All"}
            </button>
          )}
        </div>

        {/* Amenities */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">AMENITIES</h3>
          <div className="space-y-3">
            {facility.amenities?.map((amenity, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  {amenity === "Drinking Water" && (
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                  {amenity === "Parking" && (
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  )}
                  {amenity === "Coaching Available" && (
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                  {amenity === "Flood Lights" && (
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  )}
                  {amenity === "Washroom" && (
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </div>
                <span className="text-gray-700 text-sm">{amenity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Address */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">ADDRESS</h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-gray-700 text-sm leading-relaxed">{facility.address}</p>
            </div>
            <div className="w-24 h-16 bg-gray-200 rounded flex items-center justify-center">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Nearest Metro */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-blue-900 mb-2">NEAREST METRO</h3>
          <p className="text-gray-700 text-sm">
            {facility.metro_station} ({facility.metro_distance} KM)
          </p>
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
