"use client";

import { useState } from 'react';
import { coachingItemsWithUrls } from '@/data/coachingData';
import PointsDisplay from './PointsDisplay';

interface SportsSelectionProps {
  selectedLocation?: string;
  onLocationChange?: (location: string) => void;
  onRequestLocationChange?: () => void;
  userName?: string;
  userId?: string;
}

const sports = [
  {
    id: "pickleball",
    name: "Pickleball",
    icon: "/icons/pickleball.svg",
    isImage: true,
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
    id: "chess",
    name: "Chess",
    icon: "♟️",
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
    icon: "/icons/shooting.svg",
    isImage: true,
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

export default function SportsSelection({ selectedLocation = "Rajendra Nagar", onLocationChange, onRequestLocationChange, userName, userId }: SportsSelectionProps) {
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showAllSports, setShowAllSports] = useState(false);

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

  const toggleShowAllSports = () => {
    setShowAllSports(!showAllSports);
  };

  // Show only first 8 sports initially (2 rows of 4)
  const displayedSports = showAllSports ? sports : sports.slice(0, 8);
  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Hi, {userName || "Player"} 👋</h2>
            <div className="flex items-center gap-1 text-gray-600 mt-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{selectedLocation.split(' ').slice(0, 4).join(' ')}</span>
              <button
                onClick={() => {
                  if (onRequestLocationChange) {
                    onRequestLocationChange();
                  } else {
                    setShowLocationDropdown(!showLocationDropdown);
                  }
                }}
                className="ml-1 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            {!onRequestLocationChange && showLocationDropdown && (
              <div className="mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
                <div className="py-2">
                  {locations.map((location) => (
                    <button
                      key={location}
                      onClick={() => handleLocationSelect(location)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${location === selectedLocation ? 'bg-cyan-50 text-cyan-600 font-semibold' : 'text-gray-700'}`}
                    >
                      {location}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {userId && <PointsDisplay userId={userId} />}
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-gray-600 font-semibold text-sm">{(userName || 'P').charAt(0)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 h-32 rounded-2xl bg-black text-white flex items-center justify-center text-2xl font-bold">
          SUMMER OFFERS
        </div>
      </div>

      <div className="px-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Play a Sport</h3>
          <a href="#" className="text-gray-600 text-sm font-medium">See All Sports →</a>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-3">
          {displayedSports.map((sport) => (
            <a
              key={sport.id}
              href={`/search?sport=${sport.id}&location=${encodeURIComponent(selectedLocation)}`}
              className="flex flex-col items-center p-3 bg-white border border-gray-200 rounded-xl hover:shadow-sm"
            >
              <div className="text-2xl mb-2 flex items-center justify-center h-8">
                {sport.isImage ? (
                  <img src={sport.icon} alt={sport.name} className={`w-8 h-8 object-contain ${sport.id === 'pickleball' ? 'transform rotate-45' : ''}`} />
                ) : (
                  <span>{sport.icon}</span>
                )}
              </div>
              <span className="text-xs text-gray-800 text-center leading-tight truncate w-full">{sport.name}</span>
            </a>
          ))}
        </div>
        {sports.length > 8 && (
          <div className="flex justify-center mt-4">
            <button onClick={toggleShowAllSports} className="text-sm text-gray-700 underline">
              {showAllSports ? 'Show Less' : 'See More'}
            </button>
          </div>
        )}
      </div>

      <div className="px-4 mt-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Coaching & Training</h3>
          <a href="#" className="text-gray-600 text-sm font-medium">See All Coaching →</a>
        </div>
        <div className="mt-3 flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {coachingItemsWithUrls.map((item) => (
            <a key={item.id} href="#" className="min-w-[160px] bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="h-20 bg-gray-200">
                <img src={item.image} className="w-full h-full object-cover" alt={item.title} />
              </div>
              <div className="p-2">
                <div className="text-gray-900 font-medium text-xs">{item.title}</div>
                <div className="text-cyan-700 text-xs font-medium mt-1">Enroll Now</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="px-4 mt-8 pb-20">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Start Scoring</h3>
          <a href="/scoring" className="text-gray-600 text-sm font-medium">See All →</a>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <a href="/scoring/friendly" className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="h-16 bg-gray-100 flex items-center justify-center text-3xl">🏏</div>
            <div className="p-2">
              <div className="text-gray-900 font-medium text-xs">Friendly Game</div>
              <div className="text-gray-500 text-xs">Score casual matches</div>
            </div>
          </a>
          <a href="/scoring/tournaments" className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="h-16 bg-gray-100 flex items-center justify-center text-3xl">🏆</div>
            <div className="p-2">
              <div className="text-gray-900 font-medium text-xs">Tournaments</div>
              <div className="text-gray-500 text-xs">Organize and score</div>
            </div>
          </a>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-20">
        <div className="flex justify-around items-center">
          <a href="/dashboard" className="flex flex-col items-center">
            <svg className="w-6 h-6 text-red-600 mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="text-xs text-red-600 font-medium">Home</span>
            <div className="w-6 h-0.5 bg-red-600 mt-1"></div>
          </a>
          <a href="/search" className="flex flex-col items-center">
            <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
            <span className="text-xs text-red-600">Profile</span>
          </a>
        </div>
      </div>
    </div>
  );
}
