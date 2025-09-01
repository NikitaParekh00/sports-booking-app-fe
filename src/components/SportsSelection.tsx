"use client";

interface SportsSelectionProps {
  onSportSelect: (sport: string) => void;
}

const sports = [
  {
    id: "cricket",
    name: "Cricket",
    icon: "🏏",
    description: "Book cricket grounds and nets"
  },
  {
    id: "badminton",
    name: "Badminton",
    icon: "🏸",
    description: "Indoor badminton courts"
  },
  {
    id: "table-tennis",
    name: "Table Tennis",
    icon: "🏓",
    description: "TT tables and equipment"
  },
  {
    id: "shooting",
    name: "Shooting",
    icon: "🎯",
    description: "Shooting ranges and training"
  },
  {
    id: "football",
    name: "Football",
    icon: "⚽",
    description: "Football fields and futsal courts"
  },
  {
    id: "basketball",
    name: "Basketball",
    icon: "🏀",
    description: "Basketball courts"
  },
  {
    id: "tennis",
    name: "Tennis",
    icon: "🎾",
    description: "Tennis courts"
  },
  {
    id: "volleyball",
    name: "Volleyball",
    icon: "🏐",
    description: "Volleyball courts"
  },
  {
    id: "swimming",
    name: "Swimming",
    icon: "🏊",
    description: "Swimming pools"
  }
];

export default function SportsSelection({ onSportSelect }: SportsSelectionProps) {
  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
      <h2 className="text-xl font-semibold mb-2">🏆 Choose Your Sport</h2>
      <p className="text-gray-600 mb-6">
        Select a sport to see available facilities near you.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sports.map((sport) => (
          <button
            key={sport.id}
            onClick={() => onSportSelect(sport.id)}
            className="group p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{sport.icon}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {sport.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {sport.description}
                </p>
              </div>
              <div className="text-gray-400 group-hover:text-blue-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Popular Sports Quick Access */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Popular Sports</h3>
        <div className="flex flex-wrap gap-2">
          {["cricket", "badminton", "football", "table-tennis"].map((sportId) => {
            const sport = sports.find(s => s.id === sportId);
            if (!sport) return null;
            
            return (
              <button
                key={sportId}
                onClick={() => onSportSelect(sportId)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors"
              >
                <span>{sport.icon}</span>
                {sport.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
