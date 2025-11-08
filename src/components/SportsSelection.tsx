"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { coachingItemsWithUrls } from '@/data/coachingData';
import PointsDisplay from './PointsDisplay';

interface SportsSelectionProps {
  selectedLocation?: string;
  onLocationChange?: (location: string) => void;
  onRequestLocationChange?: () => void;
  userName?: string;
  userId?: string | null;
}

const sports = [
  {
    id: "pickleball",
    name: "Pickleball",
    icon: "/icons/pickleball.png",
    isImage: true,
  },
  {
    id: "padel",
    name: "Padel",
    icon: "/icons/padel.png",
    isImage: true,
  },
  {
    id: "badminton",
    name: "Badminton",
    icon: "🏸",
  },
  {
    id: "tennis-cricket",
    name: "Tennis Cricket",
    icon: "🏏",
  },
  {
    id: "cricket-nets",
    name: "Cricket Nets",
    icon: "🏏",
  },
  {
    id: "football-turf",
    name: "Football Turf",
    icon: "⚽",
  },
  {
    id: "lawn-tennis",
    name: "Lawn Tennis",
    icon: "🎾",
  },
  {
    id: "table-tennis",
    name: "Table Tennis",
    icon: "🏓",
  },
  {
    id: "squash",
    name: "Squash",
    icon: "/icons/squash.png",
    isImage: true,
  },
  {
    id: "swimming",
    name: "Swimming",
    icon: "🏊",
  },
  {
    id: "billiards",
    name: "Billiards",
    icon: "🎱",
  },
  {
    id: "basketball",
    name: "Basketball",
    icon: "🏀",
  }
];

export default function SportsSelection({ selectedLocation = "Rajendra Nagar", onLocationChange, onRequestLocationChange, userName, userId }: SportsSelectionProps) {
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showAllSports, setShowAllSports] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Banner images array
  const bannerImages = [
    { src: "/banner.png", alt: "Summer Offers" },
    { src: "/banner2.png", alt: "Special Offers" } // Add your second banner image
  ];

  // Auto-rotate banner every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prevIndex) =>
        prevIndex === bannerImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [bannerImages.length]);

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

  // Show only first 8 sports initially (2 rows of 4), then all 12 with "See More"
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

        <div className="mt-4 h-32 rounded-2xl overflow-hidden relative">
          <div className="relative w-full h-full">
            {bannerImages.map((banner, index) => (
              <Image
                key={index}
                src={banner.src}
                alt={banner.alt}
                width={400}
                height={128}
                className={`w-full h-full object-cover absolute top-0 left-0 transition-opacity duration-1000 ${index === currentBannerIndex ? 'opacity-100' : 'opacity-0'
                  }`}
              />
            ))}
          </div>

          {/* Banner indicators */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
            {bannerImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentBannerIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors duration-200 ${index === currentBannerIndex ? 'bg-white' : 'bg-white/50'
                  }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Play a Sport</h3>
          <button
            onClick={() => alert('Coming Soon')}
            className="text-gray-600 text-sm font-medium"
          >
            See All Sports →
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-3">
          {displayedSports.map((sport) => (
            <button
              key={sport.id}
              onClick={() => alert('Coming Soon')}
              className="flex flex-col items-center p-3 bg-white border border-gray-200 rounded-xl hover:shadow-sm"
            >
              <div className="text-2xl mb-2 flex items-center justify-center h-8">
                {sport.isImage ? (
                  <Image
                    src={sport.icon}
                    alt={sport.name}
                    width={sport.id === 'pickleball' || sport.id === 'padel' || sport.id === 'squash' ? 28 : 32}
                    height={sport.id === 'pickleball' || sport.id === 'padel' || sport.id === 'squash' ? 28 : 32}
                    className={`object-contain ${sport.id === 'pickleball' ? 'transform rotate-4' : ''}`}
                  />
                ) : (
                  <span>{sport.icon}</span>
                )}
              </div>
              <span className="text-xs text-gray-800 text-center leading-tight truncate w-full">{sport.name}</span>
            </button>
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
          <button
            onClick={() => alert('Coming Soon')}
            className="text-gray-600 text-sm font-medium"
          >
            See All Coaching →
          </button>
        </div>
        <div className="mt-3 flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {coachingItemsWithUrls.map((item) => {
            return (
              <button
                key={item.id}
                onClick={() => alert('Coming Soon')}
                className="min-w-[160px] bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow"
              >
                <div className="h-20 bg-gray-200">
                  <Image src={item.image} width={160} height={80} className="w-full h-full object-cover" alt={item.title} />
                </div>
                <div className="p-2">
                  <div className="text-gray-900 font-medium text-xs">{item.title}</div>
                  <div className="text-red-600 text-xs font-medium mt-1">Find Venues</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 mt-8 pb-20">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Start Scoring</h3>
          <button
            onClick={() => alert('Coming Soon')}
            className="text-gray-600 text-sm font-medium"
          >
            See All →
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            onClick={() => alert('Coming Soon')}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden text-left"
          >
            <div className="h-16 bg-gray-100 flex items-center justify-center text-3xl">🏏</div>
            <div className="p-2">
              <div className="text-gray-900 font-medium text-xs">Friendly Game</div>
              <div className="text-gray-500 text-xs">Score casual matches</div>
            </div>
          </button>
          <button
            onClick={() => alert('Coming Soon')}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden text-left"
          >
            <div className="h-16 bg-gray-100 flex items-center justify-center text-3xl">🏆</div>
            <div className="p-2">
              <div className="text-gray-900 font-medium text-xs">Tournaments</div>
              <div className="text-gray-500 text-xs">Organize and score</div>
            </div>
          </button>
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
          <button
            onClick={() => alert('Coming Soon')}
            className="flex flex-col items-center"
          >
            <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs text-gray-400">Search</span>
          </button>
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
