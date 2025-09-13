-- Standardize phone number format to +91-XXXXXXXXXX
-- This script updates all existing phone numbers to use the consistent dash format

-- Update phone numbers that are missing the dash
UPDATE public.profiles 
SET phone = '+91-' || SUBSTRING(phone FROM 4)
WHERE phone LIKE '+91%' AND phone NOT LIKE '+91-%';

-- Update phone numbers that are missing the +91 prefix
UPDATE public.profiles 
SET phone = '+91-' || phone
WHERE phone NOT LIKE '+91%' AND LENGTH(phone) = 10;

-- Verify the changes
SELECT phone, COUNT(*) as count 
FROM public.profiles 
GROUP BY phone 
ORDER BY phone;
