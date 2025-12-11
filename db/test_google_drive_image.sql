-- Test if Google Drive image is accessible
-- Replace FILE_ID with your actual file ID

-- Test URL format:
-- https://drive.google.com/uc?export=view&id=FILE_ID

-- Example with your file ID:
-- https://drive.google.com/uc?export=view&id=1geUo6rIBEkXc3ETNfcsLHSfpmBiN5Pwo

-- To test:
-- 1. Open the URL above in a browser (or incognito mode)
-- 2. If you see the image → ✅ File is public, URL works
-- 3. If you see "Sign in" or error → ❌ File is not public

-- Check current photo URLs in database
SELECT 
    name,
    photo as current_photo_url,
    CASE 
        WHEN photo LIKE '%drive.google.com/file/d/%' THEN 
            'https://drive.google.com/uc?export=view&id=' || 
            (regexp_match(photo, '/file/d/([a-zA-Z0-9_-]+)'))[1]
        WHEN photo LIKE '%drive.google.com/open?id=%' OR photo LIKE '%&id=%' THEN
            'https://drive.google.com/uc?export=view&id=' || 
            (regexp_match(photo, '[?&]id=([a-zA-Z0-9_-]+)'))[1]
        WHEN photo LIKE '%uc?export=view%' THEN
            photo  -- Already converted
        ELSE
            photo
    END as converted_url
FROM auction_player_pool
WHERE photo IS NOT NULL
ORDER BY name;

