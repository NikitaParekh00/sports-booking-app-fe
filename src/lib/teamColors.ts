// Team color mapping - shared across AuctionClient and Admin Dashboard

export const TEAM_COLOR_MAP: Record<string, string> = {
  'Aadhya': '#FFDAB9', // peach
  'Ecogreen': '#FFEB3B', // yellow
  'Gbmm': '#00897B', // peacock green
  'Mudra': '#FF69B4', // pink
  'Turf addict': '#FF9800', // orange
  'Itrani': '#4CAF50', // green
  'Turf Royals': '#1A237E', // navy blue (darker shade)
  'Singha Warriors': '#F44336', // red
  'Backyard': '#03A9F4', // light blue
  'Bhoomi realty': '#9C27B0', // purple
};

export const DEFAULT_TEAM_COLOR = '#111827';

// Helper function to get team background color
export const getTeamBackgroundColor = (teamName: string): string => {
  // Try exact match first
  if (TEAM_COLOR_MAP[teamName]) {
    return TEAM_COLOR_MAP[teamName];
  }
  
  // Try case-insensitive match
  const lowerName = teamName.toLowerCase();
  for (const [key, value] of Object.entries(TEAM_COLOR_MAP)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  
  // Default color if no match
  return DEFAULT_TEAM_COLOR;
};

// Helper function to calculate luminance of a color
export const getLuminance = (hex: string): number => {
  // Remove # if present
  const color = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(color.substring(0, 2), 16) / 255;
  const g = parseInt(color.substring(2, 4), 16) / 255;
  const b = parseInt(color.substring(4, 6), 16) / 255;
  
  // Apply gamma correction
  const [rLinear, gLinear, bLinear] = [r, g, b].map(val => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  
  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
};

// Helper function to get appropriate text color based on background
export const getTextColor = (backgroundColor: string): string => {
  const luminance = getLuminance(backgroundColor);
  // If background is light (luminance > 0.5), use dark text, otherwise use light text
  return luminance > 0.5 ? '#1F2937' : '#E5E7EB';
};
