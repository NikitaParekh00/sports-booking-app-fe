-- Setup test users for the Sports Booking App
-- Run this after setting up your Supabase project

-- First, create the test users in Supabase Auth (you'll need to do this manually in the Supabase dashboard)
-- Or use the Supabase CLI to create users

-- Test Owner User (Nikita Parekh)
-- Email: nikita@example.com
-- Password: password123
-- User ID: 0ef6e723-5254-4188-a20a-e03a63f5ae92

-- Test Customer User
-- Email: customer@example.com  
-- Password: password123
-- User ID: customer-user-id-12345

-- Insert profiles for the test users
INSERT INTO public.profiles (user_id, full_name, phone, role) VALUES
('0ef6e723-5254-4188-a20a-e03a63f5ae92', 'Nikita Parekh', '+91-7666751598', 'owner'),
('customer-user-id-12345', 'Test Customer', '+91-9876543210', 'customer')
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role;

-- Note: You'll need to create these users in Supabase Auth first:
-- 1. Go to your Supabase dashboard
-- 2. Navigate to Authentication > Users
-- 3. Click "Add user" and create:
--    - nikita@example.com with password "password123"
--    - customer@example.com with password "password123"
-- 4. Copy the user IDs and update this script accordingly

-- Alternative: Use Supabase CLI to create users
-- supabase auth signup --email nikita@example.com --password password123
-- supabase auth signup --email customer@example.com --password password123
