export interface CoachingItem {
    id: string;
    title: string;
    image: string;
    category: string;
    price?: string;
    rating?: number;
    description?: string;
}

export const coachingItems: CoachingItem[] = [
    {
        id: 'football-academy',
        title: 'Football Academy',
        image: '/images/coaching/football-academy.jpg', // Local asset path
        category: 'Sports Training',
        price: '₹2,500/month',
        rating: 4.8,
        description: 'Professional football training for all ages'
    },
    {
        id: 'yoga-classes',
        title: 'Yoga Classes',
        image: '/images/coaching/yoga-classes.jpg', // Local asset path
        category: 'Fitness',
        price: '₹1,800/month',
        rating: 4.9,
        description: 'Mindful yoga sessions for wellness'
    },
    {
        id: 'tennis-coaching',
        title: 'Tennis Coaching',
        image: '/images/coaching/tennis-coaching.jpg', // Local asset path
        category: 'Sports Training',
        price: '₹3,000/month',
        rating: 4.7,
        description: 'Expert tennis training and technique'
    },
    {
        id: 'swimming-lessons',
        title: 'Swimming Lessons',
        image: '/images/coaching/swimming-lessons.jpg', // Local asset path
        category: 'Aquatic Sports',
        price: '₹2,200/month',
        rating: 4.6,
        description: 'Learn to swim with certified instructors'
    }
];

// Alternative: Using external URLs (current approach)
export const coachingItemsWithUrls: CoachingItem[] = [
    {
        id: 'football-academy',
        title: 'Football Academy',
        image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=200&fit=crop',
        category: 'Sports Training',
        price: '₹2,500/month',
        rating: 4.8
    },
    {
        id: 'yoga-classes',
        title: 'Yoga Classes',
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=200&fit=crop',
        category: 'Fitness',
        price: '₹1,800/month',
        rating: 4.9
    },
    {
        id: 'tennis-coaching',
        title: 'Tennis Coaching',
        image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=200&fit=crop',
        category: 'Sports Training',
        price: '₹3,000/month',
        rating: 4.7
    },
    {
        id: 'swimming-lessons',
        title: 'Swimming Lessons',
        image: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=200&fit=crop',
        category: 'Aquatic Sports',
        price: '₹2,200/month',
        rating: 4.6
    }
];
