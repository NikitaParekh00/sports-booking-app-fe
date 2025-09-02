"use client";

import { useState, useEffect, useRef } from "react";

interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface LocationInputProps {
  onLocationSet: (location: Location) => void;
}

export default function LocationInput({ onLocationSet }: LocationInputProps) {
  const [manualLocation, setManualLocation] = useState("");
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{lat: number, lng: number, address: string, display_name: string}>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLocationSelect = (locationKey: string) => {
    const location = mumbaiLocations[locationKey];
    if (location) {
      onLocationSet({
        lat: location.lat,
        lng: location.lng,
        address: location.address
      });
    }
  };

  const handleLocationAccess = async () => {
    setIsGettingLocation(true);
    setError("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Try to get address from coordinates using Nominatim
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          
          if (response.ok) {
            const data = await response.json();
            const address = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            
            onLocationSet({
              lat: latitude,
              lng: longitude,
              address: address
            });
          } else {
            // Fallback to coordinates if reverse geocoding fails
            onLocationSet({
              lat: latitude,
              lng: longitude,
              address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
            });
          }
        } catch {
          // Fallback to coordinates if geocoding fails
          onLocationSet({
            lat: latitude,
            lng: longitude,
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          });
        }
        
        setIsGettingLocation(false);
      },
      () => {
        setError("Unable to access your location. Please try manual entry.");
        setIsGettingLocation(false);
      }
    );
  };

  const handleSearchLocation = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setError("");

    try {
      // Try OpenCage API first (if you have API key)
      if (process.env.NEXT_PUBLIC_OPENCAGE_API_KEY) {
        const response = await fetch(
          `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${process.env.NEXT_PUBLIC_OPENCAGE_API_KEY}&limit=5`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const results = data.results.map((result: { geometry: { lat: number; lng: number }; formatted: string }) => ({
              lat: result.geometry.lat,
              lng: result.geometry.lng,
              address: result.formatted,
              display_name: result.formatted
            }));
            setSearchResults(results);
            setShowResults(true);
            setIsSearching(false);
            return;
          }
        }
      }

      // Fallback to free Nominatim API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=in`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const results = data.map((result: { lat: string; lon: string; display_name: string }) => ({
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            address: result.display_name,
            display_name: result.display_name
          }));
          setSearchResults(results);
          setShowResults(true);
        } else {
          setSearchResults([]);
          setShowResults(false);
        }
      }
    } catch {
      // swallow
      setSearchResults([]);
      setShowResults(false);
    }
    
    setIsSearching(false);
  };

  const handleResultSelect = (result: {lat: number, lng: number, address: string, display_name: string}) => {
    onLocationSet({
      lat: result.lat,
      lng: result.lng,
      address: result.address
    });
    setManualLocation(result.display_name);
    setShowResults(false);
    setSearchResults([]);
  };

  // Predefined Mumbai locations for easy selection
  const mumbaiLocations: { [key: string]: { lat: number; lng: number; address: string } } = {
    'bandra': { lat: 19.0544, lng: 72.8406, address: 'Bandra West, Mumbai, Maharashtra' },
    'borivali': { lat: 19.2307, lng: 72.8567, address: 'Borivali West, Mumbai, Maharashtra' },
    'kandivali': { lat: 19.2034, lng: 72.8441, address: 'Kandivali West, Mumbai, Maharashtra' },
    'malad': { lat: 19.1868, lng: 72.8486, address: 'Malad West, Mumbai, Maharashtra' },
    'goregaon': { lat: 19.1590, lng: 72.8496, address: 'Goregaon West, Mumbai, Maharashtra' },
    'andheri': { lat: 19.1136, lng: 72.8697, address: 'Andheri West, Mumbai, Maharashtra' },
    'juhu': { lat: 19.1074, lng: 72.8263, address: 'Juhu, Mumbai, Maharashtra' },
    'powai': { lat: 19.1176, lng: 72.9060, address: 'Powai, Mumbai, Maharashtra' },
    'chembur': { lat: 19.0519, lng: 72.8950, address: 'Chembur, Mumbai, Maharashtra' },
    'thane': { lat: 19.2183, lng: 72.9781, address: 'Thane West, Mumbai, Maharashtra' },
    'navi mumbai': { lat: 19.0330, lng: 73.0297, address: 'Navi Mumbai, Maharashtra' },
    'dahisar': { lat: 19.2500, lng: 72.8500, address: 'Dahisar West, Mumbai, Maharashtra' },
    'vasai': { lat: 19.3833, lng: 72.8167, address: 'Vasai West, Mumbai, Maharashtra' }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLocation.trim()) return;

    const locationKey = manualLocation.toLowerCase().trim();
    
    // Check if it's a predefined Mumbai location first
    if (mumbaiLocations[locationKey]) {
      handleLocationSelect(locationKey);
      setError("");
      return;
    }

    // If there are search results, select the first one
    if (searchResults.length > 0) {
      handleResultSelect(searchResults[0]);
      return;
    }

    // Otherwise, trigger search
    handleSearchLocation(manualLocation);
  };

  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
      <h2 className="text-xl font-semibold mb-4">📍 Set Your Location</h2>
      <p className="text-gray-600 mb-6">
        Help us find the best sports facilities near you.
      </p>

      <div className="space-y-4">
        {/* GPS Location Access */}
        <button
          onClick={handleLocationAccess}
          disabled={isGettingLocation}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGettingLocation ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
          {isGettingLocation ? "Getting your location..." : "Use Current Location"}
        </button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        {/* Quick Location Buttons */}
        <div>
          <p className="text-sm text-gray-600 mb-3">Quick select Mumbai areas:</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(mumbaiLocations).slice(0, 8).map((location) => (
              <button
                key={location}
                type="button"
                onClick={() => handleLocationSelect(location)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors capitalize"
              >
                {location}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        {/* Manual Location Input */}
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div className="relative" ref={dropdownRef}>
            <input
              type="text"
              value={manualLocation}
              onChange={(e) => {
                setManualLocation(e.target.value);
                
                // Clear previous timeout
                if (searchTimeoutRef.current) {
                  clearTimeout(searchTimeoutRef.current);
                }
                
                // Set new timeout for search
                searchTimeoutRef.current = setTimeout(() => {
                  handleSearchLocation(e.target.value);
                }, 300);
              }}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowResults(true);
                }
              }}
              placeholder="Enter any address, landmark, or area (e.g., 'Siddhivinayak Temple' or 'Phoenix Mills, Lower Parel')"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleResultSelect(result)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="text-sm text-gray-900">{result.display_name}</div>
                  </button>
                ))}
              </div>
            )}
            
            {/* Loading indicator */}
            {isSearching && (
              <div className="absolute right-3 top-2.5">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={!manualLocation.trim()}
            className="w-full bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Set Location
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
