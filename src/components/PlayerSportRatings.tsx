'use client';

import {
    AUCTION_RATED_SPORT_KEYS,
    formatSportLabel,
    getOrderedSportRatings,
    type SportRatingsMap,
} from '@/lib/sportRatings';

const STAR_COUNT = 5;
const STAR_STROKE = '#000000';

function StarIcon({
    filled,
    filledColor,
    emptyColor,
    strokeColor,
}: {
    filled: boolean;
    filledColor: string;
    emptyColor: string;
    strokeColor: string;
}) {
    return (
        <svg
            className="w-7 h-7 md:w-9 md:h-9 shrink-0 block"
            viewBox="0 0 24 24"
            aria-hidden
        >
            <path
                d="M12 2.5l2.86 5.79 6.39.93-4.62 4.51 1.09 6.36L12 17.6l-5.72 3.01 1.09-6.36-4.62-4.51 6.39-.93L12 2.5z"
                fill={filled ? filledColor : emptyColor}
                stroke={strokeColor}
                strokeWidth={1.35}
                strokeLinejoin="round"
            />
        </svg>
    );
}

function StarRow({
    rating,
    filledColor,
    emptyColor,
    strokeColor,
}: {
    rating: number;
    filledColor: string;
    emptyColor: string;
    strokeColor: string;
}) {
    const filled = Math.min(STAR_COUNT, Math.max(0, Math.round(rating)));
    return (
        <span className="inline-flex items-center gap-0.5 md:gap-1 shrink-0" aria-label={`${filled} out of ${STAR_COUNT} stars`}>
            {Array.from({ length: STAR_COUNT }, (_, i) => (
                <StarIcon
                    key={i}
                    filled={i < filled}
                    filledColor={filledColor}
                    emptyColor={emptyColor}
                    strokeColor={strokeColor}
                />
            ))}
        </span>
    );
}

export interface PlayerSportRatingsProps {
    ratings?: SportRatingsMap;
    textColor: string;
    panelStyle: React.CSSProperties;
    filledStarColor?: string;
    emptyStarColor?: string;
    strokeColor?: string;
    /** List every canonical sport (Pickle … Chess), including unrated as empty stars */
    showAllRatedSports?: boolean;
}

export default function PlayerSportRatings({
    ratings,
    textColor,
    panelStyle,
    filledStarColor = '#FACC15',
    emptyStarColor = 'rgba(156, 163, 175, 0.45)',
    strokeColor = STAR_STROKE,
    showAllRatedSports = false,
}: PlayerSportRatingsProps) {
    const topSports = showAllRatedSports
        ? AUCTION_RATED_SPORT_KEYS.map((sport) => ({
              sport,
              rating: ratings?.[sport] ?? 0,
          }))
        : getOrderedSportRatings(ratings);
    if (!showAllRatedSports && topSports.length === 0) return null;

    return (
        <div className="mb-1 rounded-lg p-1 md:p-1.5" style={panelStyle}>
            <ul className="flex flex-col gap-0.5">
                {topSports.map(({ sport, rating }) => (
                    <li
                        key={sport}
                        className="flex items-center justify-between gap-2 py-0 leading-none min-h-0"
                    >
                        <span className="text-base md:text-lg font-semibold truncate" style={{ color: textColor }}>
                            {formatSportLabel(sport)}
                        </span>
                        <StarRow
                            rating={rating}
                            filledColor={filledStarColor}
                            emptyColor={emptyStarColor}
                            strokeColor={strokeColor}
                        />
                    </li>
                ))}
            </ul>
        </div>
    );
}