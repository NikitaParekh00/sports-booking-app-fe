"use client";

import { useState } from "react";

const popularSports = [
  {
    id: "box-cricket",
    name: "Box Cricket",
    icon: "🏏",
  },
  {
    id: "football",
    name: "Football",
    icon: "⚽",
  },
  {
    id: "pickleball",
    name: "Pickleball",
    icon: "🏓",
  },
  {
    id: "billiard",
    name: "Billiard",
    icon: "🎱",
  },
  {
    id: "volleyball",
    name: "Volleyball",
    icon: "🏐",
  },
  {
    id: "cricket-nets",
    name: "Cricket Nets",
    icon: "🏏",
  }
];

const filterCategories = [
  { id: "all", name: "All", active: true },
  { id: "venues", name: "Venues", active: false },
  { id: "groups", name: "Groups", active: false },
  { id: "games", name: "Games", active: false }
];

export default function SearchPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("Rajendra Nagar");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  
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
      <div className="px-4 py-4 bg-white rounded-t-3xl -mt-4 relative z-10 shadow-lg">
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search for venues"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-gray-100 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 placeholder-gray-500"
            />
          </div>
          <button className="px-4 py-3 bg-red-100 rounded-lg flex items-center gap-2 hover:bg-red-200 transition-colors">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
            </svg>
            <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
            </svg>
            <span className="text-red-600 font-medium text-sm">Availability</span>
          </button>
        </div>
      </div>

      {/* Filter Categories */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto">
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-full text-gray-600 text-sm font-medium whitespace-nowrap hover:bg-gray-50">
            Filter
          </button>
          {filterCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveFilter(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === category.id
                  ? 'bg-red-500 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Popular Sports Section */}
      <div className="px-4 pb-20">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Popular Sports</h2>
        <div className="grid grid-cols-4 gap-4">
          {popularSports.map((sport) => (
            <button
              key={sport.id}
              className="flex flex-col items-center p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="text-2xl mb-2">{sport.icon}</div>
              <span className="text-xs text-gray-700 text-center leading-tight">
                {sport.name}
              </span>
            </button>
          ))}
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

