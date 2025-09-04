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

	return (
    <div className="min-h-screen bg-white">
      {/* Main Navigation Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-6">
        {/* Top Status Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm">11:51</span>
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.076 13.308-5.076 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05c-3.124-3.124-8.19-3.124-11.314 0a1 1 0 01-1.414-1.414c4.01-4.01 10.522-4.01 14.532 0a1 1 0 01-1.414 1.414zM12.12 13.88c-1.171-1.171-3.073-1.171-4.244 0a1 1 0 01-1.415-1.415c2.053-2.053 5.378-2.053 7.431 0a1 1 0 01-1.415 1.415zM9 16a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd"/>
            </svg>
            <span className="text-white text-sm">46</span>
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
            </svg>
          </div>
        </div>
        
        {/* Logo and Location Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
            </svg>
            <span className="text-white font-medium">Rajendra Nagar</span>
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </div>
          
          {/* SIMPLIFIT Logo */}
          <div className="flex items-center gap-2">
            {/* Runner Icon */}
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13.5 5.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1.4-3.9-3.2l-1-.3-.3 1c-.4 1.2-1.5 2-2.8 2-1.7 0-3.1-1.4-3.1-3.1 0-1.7 1.4-3.1 3.1-3.1.8 0 1.5.3 2.1.8l.7-.7c-.7-.7-1.7-1.1-2.8-1.1-2.2 0-4 1.8-4 4s1.8 4 4 4c1.1 0 2.1-.4 2.8-1.1l-.7-.7c-.6.5-1.3.8-2.1.8z"/>
            </svg>
            
            {/* SIMPLIFIT Text */}
            <div className="text-white font-bold text-lg">
              <div className="flex items-center">
                <span className="italic">SIMPLI</span>
                <div className="w-1 h-6 bg-white rounded-full mx-1"></div>
                <span className="italic">FIT</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Availability Section */}
      <div className="px-4 py-4">
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
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
            <span className="text-red-600 font-bold text-sm mb-1">grip</span>
            <span className="text-xs text-gray-400">Profile</span>
          </div>
        </div>
      </div>
		</div>
	);
}

