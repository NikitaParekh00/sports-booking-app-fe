"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";

interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface TurfListingProps {
  location: Location;
  sport: string;
  onBack: () => void;
}

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

const sportIcons: { [key: string]: string } = {
  cricket: "🏏",
  badminton: "🏸",
  "table-tennis": "🏓",
  shooting: "🎯",
  football: "⚽",
  basketball: "🏀",
  tennis: "🎾",
  volleyball: "🏐",
  swimming: "🏊"
};

export default function TurfListing({ location, sport, onBack }: TurfListingProps) {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const supabase = createClient();

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    async function fetchFacilities() {
      try {
        setLoading(true);
        setError("");

        // Try to use the database function for location-based filtering first
        let facilitiesData = null;
        let facilitiesError = null;

        try {
          // Use the database function to get facilities within 50km radius
          const { data: radiusData, error: radiusError } = await supabase
            .rpc('get_facilities_within_radius', {
              p_latitude: location.lat,
              p_longitude: location.lng,
              p_radius_km: 50,
              p_sport: sport
            });

          if (!radiusError && radiusData && radiusData.length > 0) {
            // Convert the function result to our expected format
            facilitiesData = radiusData.map((facility: { facility_id: string; name: string; city: string; address: string; latitude: number; longitude: number; sport: string; price_per_hour: number; distance_km: number }) => ({
              id: facility.facility_id,
              name: facility.name,
              city: facility.city,
              address: facility.address,
              latitude: facility.latitude,
              longitude: facility.longitude,
              sport: facility.sport,
              price_per_hour: facility.price_per_hour,
              status: 'approved',
              distance: facility.distance_km
            }));

            // Fetch court details for these facilities
            if (facilitiesData.length > 0) {
              const facilityIds = facilitiesData.map((f: Facility) => f.id);
              const { data: courtsData } = await supabase
                .from('courts')
                .select('id, name, facility_id, capacity, amenities')
                .in('facility_id', facilityIds);

              // Attach courts to facilities
              facilitiesData = facilitiesData.map((facility: Facility) => ({
                ...facility,
                courts: courtsData?.filter(court => court.facility_id === facility.id) || []
              }));
            }
          } else {
            // Fallback to regular query if function fails or returns no results
            const { data: regularData, error: regularError } = await supabase
              .from('facilities')
              .select(`
                id,
                name,
                city,
                address,
                latitude,
                longitude,
                sport,
                price_per_hour,
                description,
                images,
                phone,
                email,
                status,
                courts (
                  id,
                  name,
                  capacity,
                  amenities
                )
              `)
              .eq('sport', sport)
              .eq('status', 'approved')
              .not('latitude', 'is', null)
              .not('longitude', 'is', null);

            facilitiesData = regularData;
            facilitiesError = regularError;
          }
        } catch {
          // If function doesn't exist or fails, use regular query
          const { data: regularData, error: regularError } = await supabase
            .from('facilities')
            .select(`
              id,
              name,
              city,
              address,
              latitude,
              longitude,
              sport,
              price_per_hour,
              description,
              images,
              phone,
              email,
              status,
              courts (
                id,
                name,
                capacity,
                amenities
              )
            `)
            .eq('sport', sport)
            .eq('status', 'approved')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null);

          facilitiesData = regularData;
          facilitiesError = regularError;
        }

        if (facilitiesError) {
          console.error("Supabase error:", facilitiesError);
          throw facilitiesError;
        }

        console.log("Fetched facilities:", facilitiesData);
        console.log("Number of facilities found:", facilitiesData?.length || 0);
        console.log("Selected sport:", sport);

        // Use real data from database
        const facilitiesToShow = facilitiesData || [];

        // Calculate distances and sort by nearest first
        const facilitiesWithDistance = facilitiesToShow.map((facility: Facility) => {
          let distance = 0;

          if (facility.latitude && facility.longitude) {
            // Use real coordinates from database
            distance = calculateDistance(
              location.lat,
              location.lng,
              facility.latitude,
              facility.longitude
            );
          } else {
            // If no coordinates, use a random distance for demo
            distance = Math.random() * 10; // Random distance between 0-10km
          }

          return {
            ...facility,
            distance: distance
          };
        });

        // Sort by distance (nearest first)
        facilitiesWithDistance.sort((a: Facility, b: Facility) => (a.distance || 0) - (b.distance || 0));

        setFacilities(facilitiesWithDistance);
      } catch (err) {
        console.error("Error fetching facilities:", err);
        setError("Failed to load facilities. Please try again.");
        setFacilities([]);
      } finally {
        setLoading(false);
      }
    }

    fetchFacilities();
  }, [location, sport, supabase]);

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const formatPrice = (price: number): string => {
    return `₹${price}/hour`;
  };

  const getSportName = (sportId: string): string => {
    const sportNames: { [key: string]: string } = {
      cricket: "Cricket",
      badminton: "Badminton",
      "table-tennis": "Table Tennis",
      shooting: "Shooting",
      football: "Football",
      basketball: "Basketball",
      tennis: "Tennis",
      volleyball: "Volleyball",
      swimming: "Swimming"
    };
    return sportNames[sportId] || sportId;
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          <span className="ml-3 text-gray-600">Loading facilities...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span>{sportIcons[sport]}</span>
                {getSportName(sport)} Facilities
              </h2>
              <p className="text-sm text-gray-600">
                Near {location.address}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Facilities List */}
      {facilities.length === 0 && !loading ? (
        <div className="bg-white p-8 rounded-lg border shadow-sm text-center">
          <div className="text-4xl mb-4">{sportIcons[sport]}</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No {getSportName(sport)} facilities found
          </h3>
          <p className="text-gray-600 mb-4">
            We couldn&apos;t find any {getSportName(sport).toLowerCase()} facilities near your location.
          </p>
          <button
            onClick={onBack}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Another Sport
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {facilities.map((facility) => (
            <div key={facility.id} className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {facility.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2">
                    {facility.address}, {facility.city}
                  </p>
                  {facility.description && (
                    <p className="text-gray-500 text-xs mb-2">
                      {facility.description}
                    </p>
                  )}
                  {facility.distance && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {formatDistance(facility.distance)} away
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-green-600">
                    {formatPrice(facility.price_per_hour)}
                  </div>
                  <div className="text-xs text-gray-500">per hour</div>
                </div>
              </div>

              {/* Courts */}
              {facility.courts && facility.courts.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Available Courts:</h4>
                  <div className="flex flex-wrap gap-2">
                    {facility.courts.map((court) => (
                      <span
                        key={court.id}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {court.name}
                        {court.capacity && ` (${court.capacity} people)`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              {(facility.phone || facility.email) && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Contact:</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    {facility.phone && <div>📞 {facility.phone}</div>}
                    {facility.email && <div>✉️ {facility.email}</div>}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                  View Details
                </button>
                <a
                  href="/login"
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-center"
                >
                  Book Now
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
