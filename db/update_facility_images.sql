-- Update facility images in the database
-- Replace the facility_id and image URLs with your actual values

-- OPTION 1: Update images for a specific facility by ID (Badminton Court Images)
UPDATE public.facilities
SET images = ARRAY[
    'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop',  -- Badminton court - players in action
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',  -- Badminton court - professional setup
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&h=600&fit=crop',   -- Badminton court - indoor facility
    'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=800&h=600&fit=crop',   -- Badminton court - match in progress
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=600&fit=crop'  -- Badminton court - modern facility
]
WHERE id = 'f38bd9cd-e26e-4fa3-a97a-4bf608404f11';  -- Replace with your facility ID

-- OPTION 2: Update images for a facility by name (Badminton Images)
UPDATE public.facilities
SET images = ARRAY[
    'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop',  -- Badminton players
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',  -- Badminton court
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&h=600&fit=crop'   -- Badminton facility
]
WHERE name = 'Test Badminton Center';

-- OPTION 3: Add a single badminton image (if images column is NULL or empty)
UPDATE public.facilities
SET images = ARRAY['https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop']  -- Badminton court image
WHERE id = 'f38bd9cd-e26e-4fa3-a97a-4bf608404f11'
AND (images IS NULL OR array_length(images, 1) IS NULL);

-- OPTION 4: Use your own image URLs (upload to Supabase Storage or use external URLs)
UPDATE public.facilities
SET images = ARRAY[
    'https://your-image-url-1.com/image.jpg',
    'https://your-image-url-2.com/image.jpg',
    'https://your-image-url-3.com/image.jpg'
]
WHERE id = 'f38bd9cd-e26e-4fa3-a97a-4bf608404f11';

-- HELPER QUERIES:

-- Check current images for a facility
SELECT id, name, images, array_length(images, 1) as image_count
FROM public.facilities
WHERE id = 'f38bd9cd-e26e-4fa3-a97a-4bf608404f11';

-- Find all facilities with their image counts
SELECT id, name, sport, 
       CASE 
         WHEN images IS NULL THEN 0 
         ELSE array_length(images, 1) 
       END as image_count,
       images
FROM public.facilities
ORDER BY name;

-- ============================================
-- BADMINTON IMAGE URLS (Unsplash)
-- ============================================
-- Professional badminton court images you can use:

-- 1. Badminton players in action
-- https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop

-- 2. Professional badminton court setup
-- https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop

-- 3. Indoor badminton facility
-- https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&h=600&fit=crop

-- 4. Badminton match in progress
-- https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=800&h=600&fit=crop

-- 5. Modern badminton facility
-- https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=600&fit=crop

-- 6. Badminton court with lighting
-- https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop

-- 7. Badminton shuttlecock and racket
-- https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&h=600&fit=crop

-- 8. Badminton doubles match
-- https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=600&fit=crop

