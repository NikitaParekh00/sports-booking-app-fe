-- Insert test profile for debugging
-- Run this in your Supabase SQL editor

INSERT INTO public.profiles (user_id, full_name, phone, role) VALUES
('a49e0e97-71d8-4d48-808b-aa531abc60cf', 'Priya Sharma', '+91-7506256356', 'owner')
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role;

-- Also insert the other test profile
INSERT INTO public.profiles (user_id, full_name, phone, role) VALUES
('0ef6e723-5254-4188-a20a-e03a63f5ae92', 'Nikita Parekh', '+91-7666751598', 'owner')
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role;
