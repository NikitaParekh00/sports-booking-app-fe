"use client";

interface SportsSelectionProps {
  onSportSelect: (sport: string) => void;
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

export default function SportsSelection({ onSportSelect }: SportsSelectionProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Main Navigation Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-6">
        {/* Top Status Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm">11:07</span>
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
            <span className="text-white text-sm">47</span>
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

      {/* Main Content */}
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">PICK A SPORT</h1>
        
        {/* Sports Grid */}
        <div className="grid grid-cols-5 gap-4">
          {sports.map((sport) => (
            <button
              key={sport.id}
              onClick={() => onSportSelect(sport.id)}
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
            <span className="text-red-600 font-bold text-sm mb-1">grip</span>
            <span className="text-xs text-red-600">Profile</span>
          </div>
        </div>
      </div>
    </div>
  );
}
