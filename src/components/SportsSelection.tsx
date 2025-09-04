"use client";

import { useState } from 'react';

interface SportsSelectionProps {
  onSportSelect: (sport: string) => void;
  selectedLocation?: string;
  onLocationChange?: (location: string) => void;
}

const sports = [
  {
    id: "pickleball",
    name: "Pickleball",
    icon: "🏓",
  },
  {
    id: "football",
    name: "Football",
    icon: "⚽",
  },
  {
    id: "badminton",
    name: "Badminton",
    icon: "🏸",
  },
  {
    id: "box-cricket",
    name: "Box Cricket",
    icon: "🏏",
  },
  {
    id: "cricket-nets",
    name: "Cricket Nets",
    icon: "🏏",
  },
  {
    id: "table-tennis",
    name: "Table Tennis",
    icon: "🏓",
  },
  {
    id: "volleyball",
    name: "Volleyball",
    icon: "🏐",
  },
  {
    id: "carrom",
    name: "Carrom",
    icon: "🎯",
  },
  {
    id: "billiard",
    name: "Billiard",
    icon: "🎱",
  },
  {
    id: "others",
    name: "Others",
    icon: "➕",
  },
  {
    id: "esports",
    name: "Esports",
    icon: "🎮",
  },
  {
    id: "gym",
    name: "Gym",
    icon: "🏋️",
  },
  {
    id: "ice-plunge-sauna",
    name: "Ice Plunge & Sauna",
    icon: "🧊",
  },
  {
    id: "pilates-group",
    name: "Pilates (Group of 2)",
    icon: "🧘",
  },
  {
    id: "padel-coaching",
    name: "Padel Coaching",
    icon: "🎾",
  },
  {
    id: "physiotherapy-pilates",
    name: "Physiotherapy + Pilates",
    icon: "🏥",
  },
  {
    id: "pilates-single",
    name: "Pilates (Single Pers...)",
    icon: "🧘",
  },
  {
    id: "pool",
    name: "Pool",
    icon: "🎱",
  },
  {
    id: "cycling",
    name: "Cycling",
    icon: "🚴",
  },
  {
    id: "ultimate-frisbee",
    name: "Ultimate Frisbee",
    icon: "🥏",
  },
  {
    id: "chess",
    name: "Chess",
    icon: "♟️",
  },
  {
    id: "bouldering",
    name: "Bouldering",
    icon: "🧗",
  },
  {
    id: "athletics",
    name: "Athletics",
    icon: "🏃",
  },
  {
    id: "padel",
    name: "Padel",
    icon: "🎾",
  },
  {
    id: "hockey",
    name: "Hockey",
    icon: "🏑",
  },
  {
    id: "yoga",
    name: "Yoga",
    icon: "🧘",
  },
  {
    id: "rock-climbing",
    name: "Rock Climbing",
    icon: "🧗",
  },
  {
    id: "shooting",
    name: "Shooting",
    icon: "🎯",
  },
  {
    id: "handball",
    name: "Handball",
    icon: "🤾",
  },
  {
    id: "squash",
    name: "Squash",
    icon: "🏓",
  },
  {
    id: "basketball",
    name: "Basketball",
    icon: "🏀",
  },
  {
    id: "tennis",
    name: "Tennis",
    icon: "🎾",
  },
  {
    id: "swimming",
    name: "Swimming",
    icon: "🏊",
  }
];

export default function SportsSelection({ onSportSelect, selectedLocation = "Rajendra Nagar", onLocationChange }: SportsSelectionProps) {
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
    console.log('Location selected:', location);
    onLocationChange?.(location);
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

      {/* Main Content */}
      <div className="px-4 py-4 bg-white rounded-t-3xl -mt-4 relative z-10 shadow-lg">
        <h1 className="text-lg font-semibold text-gray-700 mb-3">PICK A SPORT</h1>
        
        {/* Sports Grid */}
        <div className="grid grid-cols-4 gap-3">
          {sports.map((sport) => (
            <button
              key={sport.id}
              onClick={() => onSportSelect(sport.id)}
              className="flex flex-col items-center p-3 hover:bg-gray-50 rounded-lg transition-colors aspect-square"
            >
              <div className="text-4xl mb-2">{sport.icon}</div>
              <span className="text-xs text-gray-700 text-center leading-tight truncate w-full">
                {sport.name.length > 12 ? `${sport.name.substring(0, 12)}...` : sport.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-20">
        <div className="flex justify-around items-center">
          <a href="/dashboard" className="flex flex-col items-center">
            <svg className="w-6 h-6 text-red-600 mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
            </svg>
            <span className="text-xs text-red-600 font-medium">Home</span>
            <div className="w-6 h-0.5 bg-red-600 mt-1"></div>
          </a>
          <a href="/search" className="flex flex-col items-center">
            <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <span className="text-xs text-gray-400">Search</span>
          </a>
          <div className="flex flex-col items-center">
            <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <span className="text-xs text-gray-400">Community</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-red-600 font-bold text-xs mb-1">SIMPLIFIT</span>
            <span className="text-xs text-red-600">Profile</span>
          </div>
        </div>
      </div>
    </div>
  );
}
