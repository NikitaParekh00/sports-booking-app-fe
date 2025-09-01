-- Dummy data for Sports Booking App
-- Run this after your main schema.sql

-- First, let's create some sample users (you'll need to replace these with real auth.users IDs)
-- Note: In production, these would be created through Supabase Auth

-- Sample profiles (using your actual user IDs)
INSERT INTO public.profiles (user_id, full_name, phone, role) VALUES
-- Facility Owners
('0ef6e723-5254-4188-a20a-e03a63f5ae92', 'Nikita Parekh', '+91-7666751598', 'owner'),
('a49e0e97-71d8-4d48-808b-aa531abc60cf', 'Priya Sharma', '+91-7506256356', 'owner');

-- Sample Facilities (Turfs) - All in Mumbai with different areas
INSERT INTO public.facilities (id, owner_id, name, city, address, latitude, longitude, sport, price_per_hour, description, images, phone, email, status) VALUES
-- Cricket Facilities
('11111111-1111-1111-1111-111111111111', '0ef6e723-5254-4188-a20a-e03a63f5ae92', 'Bandra Cricket Academy', 'Mumbai', 'Bandra West, Mumbai, Maharashtra', 19.0544, 72.8406, 'cricket', 800, 'Professional cricket training facility with multiple grounds and nets. Perfect for practice sessions and tournaments.', ARRAY['https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=500', 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=500'], '+91-9876543210', 'info@bandracricket.com', 'approved'),

('11111111-1111-1111-1111-111111111112', 'a49e0e97-71d8-4d48-808b-aa531abc60cf', 'Borivali Sports Complex', 'Mumbai', 'Borivali West, Mumbai, Maharashtra', 19.2307, 72.8567, 'cricket', 750, 'Premium cricket facility in Borivali with floodlights and professional coaching.', ARRAY['https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=500'], '+91-9876543211', 'contact@borivalisports.com', 'approved'),

-- Badminton Facilities
('22222222-2222-2222-2222-222222222222', '0ef6e723-5254-4188-a20a-e03a63f5ae92', 'Kandivali Shuttle Center', 'Mumbai', 'Kandivali West, Mumbai, Maharashtra', 19.2034, 72.8441, 'badminton', 400, 'Modern badminton facility with 6 courts, air conditioning, and professional lighting.', ARRAY['https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500'], '+91-9876543212', 'info@kandivalishuttle.com', 'approved'),

('22222222-2222-2222-2222-222222222223', 'a49e0e97-71d8-4d48-808b-aa531abc60cf', 'Malad Racquet Club', 'Mumbai', 'Malad West, Mumbai, Maharashtra', 19.1868, 72.8486, 'badminton', 450, 'Exclusive badminton club with premium facilities and coaching services.', ARRAY['https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500'], '+91-9876543213', 'bookings@maladracquet.com', 'approved'),

-- Table Tennis Facilities
('33333333-3333-3333-3333-333333333333', '0ef6e723-5254-4188-a20a-e03a63f5ae92', 'Goregaon Ping Pong Palace', 'Mumbai', 'Goregaon West, Mumbai, Maharashtra', 19.1590, 72.8496, 'table-tennis', 300, 'Dedicated table tennis facility with professional tables and coaching.', ARRAY['https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=500'], '+91-9876543214', 'info@goregaonpingpong.com', 'approved'),

-- Shooting Facilities
('44444444-4444-4444-4444-444444444444', 'a49e0e97-71d8-4d48-808b-aa531abc60cf', 'Andheri Precision Range', 'Mumbai', 'Andheri West, Mumbai, Maharashtra', 19.1136, 72.8697, 'shooting', 1200, 'Professional shooting range with 10m and 25m ranges. Safety equipment provided.', ARRAY['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500'], '+91-9876543215', 'shooting@andheriprecision.com', 'approved'),

-- Football Facilities
('55555555-5555-5555-5555-555555555555', '0ef6e723-5254-4188-a20a-e03a63f5ae92', 'Juhu Goal Masters', 'Mumbai', 'Juhu, Mumbai, Maharashtra', 19.1074, 72.8263, 'football', 900, 'Full-size football ground with floodlights and changing rooms.', ARRAY['https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=500'], '+91-9876543216', 'info@juhugoals.com', 'approved'),

-- Basketball Facilities
('66666666-6666-6666-6666-666666666666', 'a49e0e97-71d8-4d48-808b-aa531abc60cf', 'Powai Hoops & Dreams', 'Mumbai', 'Powai, Mumbai, Maharashtra', 19.1176, 72.9060, 'basketball', 500, 'Indoor and outdoor basketball courts with professional equipment.', ARRAY['https://images.unsplash.com/photo-1546519638-68e109498ffc?w=500'], '+91-9876543217', 'bookings@powaihoops.com', 'approved'),

-- Tennis Facilities
('77777777-7777-7777-7777-777777777777', '0ef6e723-5254-4188-a20a-e03a63f5ae92', 'Chembur Ace Tennis', 'Mumbai', 'Chembur, Mumbai, Maharashtra', 19.0519, 72.8950, 'tennis', 700, 'Premium tennis club with clay and hard courts.', ARRAY['https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=500'], '+91-9876543218', 'info@chemburtennis.com', 'approved'),

-- Volleyball Facilities
('88888888-8888-8888-8888-888888888888', 'a49e0e97-71d8-4d48-808b-aa531abc60cf', 'Thane Spike Zone', 'Mumbai', 'Thane West, Mumbai, Maharashtra', 19.2183, 72.9781, 'volleyball', 400, 'Beach and indoor volleyball courts with professional setup.', ARRAY['https://images.unsplash.com/photo-1612872087724-bb876b2e67d1?w=500'], '+91-9876543219', 'bookings@thanespike.com', 'approved'),

-- Swimming Facilities
('99999999-9999-9999-9999-999999999999', '0ef6e723-5254-4188-a20a-e03a63f5ae92', 'Navi Mumbai Aqua Center', 'Mumbai', 'Navi Mumbai, Maharashtra', 19.0330, 73.0297, 'swimming', 350, 'Olympic-size swimming pool with professional coaching and safety equipment.', ARRAY['https://images.unsplash.com/photo-1530549387789-4c1017266635?w=500'], '+91-9876543220', 'info@navimumbaiaqua.com', 'approved');

-- Sample Courts
INSERT INTO public.courts (id, facility_id, name, capacity, amenities) VALUES
-- Cricket Courts
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Main Ground', 22, ARRAY['lights', 'parking', 'changing_room', 'water']),
('c1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Practice Net 1', 4, ARRAY['lights', 'parking']),
('c1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Practice Net 2', 4, ARRAY['lights', 'parking']),

('c1111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111112', 'Cricket Ground A', 22, ARRAY['lights', 'parking', 'changing_room', 'water', 'coaching']),
('c1111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111112', 'Cricket Ground B', 22, ARRAY['lights', 'parking', 'changing_room']),

-- Badminton Courts
('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Court 1', 4, ARRAY['ac', 'lights', 'parking', 'changing_room']),
('c2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'Court 2', 4, ARRAY['ac', 'lights', 'parking', 'changing_room']),
('c2222222-2222-2222-2222-222222222224', '22222222-2222-2222-2222-222222222222', 'Court 3', 4, ARRAY['ac', 'lights', 'parking', 'changing_room']),
('c2222222-2222-2222-2222-222222222225', '22222222-2222-2222-2222-222222222222', 'Court 4', 4, ARRAY['ac', 'lights', 'parking', 'changing_room']),
('c2222222-2222-2222-2222-222222222226', '22222222-2222-2222-2222-222222222222', 'Court 5', 4, ARRAY['ac', 'lights', 'parking', 'changing_room']),
('c2222222-2222-2222-2222-222222222227', '22222222-2222-2222-2222-222222222222', 'Court 6', 4, ARRAY['ac', 'lights', 'parking', 'changing_room']),

('c2222222-2222-2222-2222-222222222228', '22222222-2222-2222-2222-222222222223', 'Premium Court', 4, ARRAY['ac', 'lights', 'parking', 'changing_room', 'coaching']),
('c2222222-2222-2222-2222-222222222229', '22222222-2222-2222-2222-222222222223', 'Standard Court', 4, ARRAY['ac', 'lights', 'parking']),

-- Table Tennis Courts
('c3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Table 1', 4, ARRAY['ac', 'lights', 'parking']),
('c3333333-3333-3333-3333-333333333334', '33333333-3333-3333-3333-333333333333', 'Table 2', 4, ARRAY['ac', 'lights', 'parking']),
('c3333333-3333-3333-3333-333333333335', '33333333-3333-3333-3333-333333333333', 'Table 3', 4, ARRAY['ac', 'lights', 'parking']),

-- Shooting Ranges
('c4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'Range A (10m)', 1, ARRAY['safety_equipment', 'parking', 'changing_room', 'coaching']),
('c4444444-4444-4444-4444-444444444445', '44444444-4444-4444-4444-444444444444', 'Range B (25m)', 1, ARRAY['safety_equipment', 'parking', 'changing_room', 'coaching']),

-- Football Courts
('c5555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'Full Size Ground', 22, ARRAY['lights', 'parking', 'changing_room', 'water']),
('c5555555-5555-5555-5555-555555555556', '55555555-5555-5555-5555-555555555555', 'Futsal Court', 10, ARRAY['lights', 'parking', 'changing_room']),

-- Basketball Courts
('c6666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', 'Indoor Court', 10, ARRAY['ac', 'lights', 'parking', 'changing_room']),
('c6666666-6666-6666-6666-666666666667', '66666666-6666-6666-6666-666666666666', 'Outdoor Court', 10, ARRAY['lights', 'parking', 'changing_room']),

-- Tennis Courts
('c7777777-7777-7777-7777-777777777777', '77777777-7777-7777-7777-777777777777', 'Clay Court', 4, ARRAY['lights', 'parking', 'changing_room', 'water']),
('c7777777-7777-7777-7777-777777777778', '77777777-7777-7777-7777-777777777777', 'Hard Court', 4, ARRAY['lights', 'parking', 'changing_room', 'water']),

-- Volleyball Courts
('c8888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-888888888888', 'Beach Court', 12, ARRAY['lights', 'parking', 'changing_room']),
('c8888888-8888-8888-8888-888888888889', '88888888-8888-8888-8888-888888888888', 'Indoor Court', 12, ARRAY['ac', 'lights', 'parking', 'changing_room']),

-- Swimming Pools
('c9999999-9999-9999-9999-999999999999', '99999999-9999-9999-9999-999999999999', 'Olympic Pool', 8, ARRAY['safety_equipment', 'parking', 'changing_room', 'coaching']),
('c9999999-9999-9999-9999-999999999998', '99999999-9999-9999-9999-999999999999', 'Training Pool', 6, ARRAY['safety_equipment', 'parking', 'changing_room', 'coaching']);

-- Sample Availability Rules
INSERT INTO public.availability_rules (id, court_id, weekday, start_time, end_time, interval_minutes) VALUES
-- Cricket Ground - Available Mon-Fri 6AM-10PM, Sat-Sun 5AM-11PM
('a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 1, '06:00:00', '22:00:00', 120), -- Monday
('a1111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111111', 2, '06:00:00', '22:00:00', 120), -- Tuesday
('a1111111-1111-1111-1111-111111111113', 'c1111111-1111-1111-1111-111111111111', 3, '06:00:00', '22:00:00', 120), -- Wednesday
('a1111111-1111-1111-1111-111111111114', 'c1111111-1111-1111-1111-111111111111', 4, '06:00:00', '22:00:00', 120), -- Thursday
('a1111111-1111-1111-1111-111111111115', 'c1111111-1111-1111-1111-111111111111', 5, '06:00:00', '22:00:00', 120), -- Friday
('a1111111-1111-1111-1111-111111111116', 'c1111111-1111-1111-1111-111111111111', 6, '05:00:00', '23:00:00', 120), -- Saturday
('a1111111-1111-1111-1111-111111111117', 'c1111111-1111-1111-1111-111111111111', 0, '05:00:00', '23:00:00', 120), -- Sunday

-- Badminton Courts - Available daily 6AM-11PM
('a2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 1, '06:00:00', '23:00:00', 60), -- Monday
('a2222222-2222-2222-2222-222222222223', 'c2222222-2222-2222-2222-222222222222', 2, '06:00:00', '23:00:00', 60), -- Tuesday
('a2222222-2222-2222-2222-222222222224', 'c2222222-2222-2222-2222-222222222222', 3, '06:00:00', '23:00:00', 60), -- Wednesday
('a2222222-2222-2222-2222-222222222225', 'c2222222-2222-2222-2222-222222222222', 4, '06:00:00', '23:00:00', 60), -- Thursday
('a2222222-2222-2222-2222-222222222226', 'c2222222-2222-2222-2222-222222222222', 5, '06:00:00', '23:00:00', 60), -- Friday
('a2222222-2222-2222-2222-222222222227', 'c2222222-2222-2222-2222-222222222222', 6, '06:00:00', '23:00:00', 60), -- Saturday
('a2222222-2222-2222-2222-222222222228', 'c2222222-2222-2222-2222-222222222222', 0, '06:00:00', '23:00:00', 60), -- Sunday

-- Table Tennis - Available daily 7AM-10PM
('a3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 1, '07:00:00', '22:00:00', 60), -- Monday
('a3333333-3333-3333-3333-333333333334', 'c3333333-3333-3333-3333-333333333333', 2, '07:00:00', '22:00:00', 60), -- Tuesday
('a3333333-3333-3333-3333-333333333335', 'c3333333-3333-3333-3333-333333333333', 3, '07:00:00', '22:00:00', 60), -- Wednesday
('a3333333-3333-3333-3333-333333333336', 'c3333333-3333-3333-3333-333333333333', 4, '07:00:00', '22:00:00', 60), -- Thursday
('a3333333-3333-3333-3333-333333333337', 'c3333333-3333-3333-3333-333333333333', 5, '07:00:00', '22:00:00', 60), -- Friday
('a3333333-3333-3333-3333-333333333338', 'c3333333-3333-3333-3333-333333333333', 6, '07:00:00', '22:00:00', 60), -- Saturday
('a3333333-3333-3333-3333-333333333339', 'c3333333-3333-3333-3333-333333333333', 0, '07:00:00', '22:00:00', 60), -- Sunday

-- Shooting Range - Available daily 9AM-8PM
('a4444444-4444-4444-4444-444444444444', 'c4444444-4444-4444-4444-444444444444', 1, '09:00:00', '20:00:00', 60), -- Monday
('a4444444-4444-4444-4444-444444444445', 'c4444444-4444-4444-4444-444444444444', 2, '09:00:00', '20:00:00', 60), -- Tuesday
('a4444444-4444-4444-4444-444444444446', 'c4444444-4444-4444-4444-444444444444', 3, '09:00:00', '20:00:00', 60), -- Wednesday
('a4444444-4444-4444-4444-444444444447', 'c4444444-4444-4444-4444-444444444444', 4, '09:00:00', '20:00:00', 60), -- Thursday
('a4444444-4444-4444-4444-444444444448', 'c4444444-4444-4444-4444-444444444444', 5, '09:00:00', '20:00:00', 60), -- Friday
('a4444444-4444-4444-4444-444444444449', 'c4444444-4444-4444-4444-444444444444', 6, '09:00:00', '20:00:00', 60), -- Saturday
('a4444444-4444-4444-4444-444444444450', 'c4444444-4444-4444-4444-444444444444', 0, '09:00:00', '20:00:00', 60), -- Sunday

-- Football Ground - Available daily 5AM-11PM
('a5555555-5555-5555-5555-555555555555', 'c5555555-5555-5555-5555-555555555555', 1, '05:00:00', '23:00:00', 90), -- Monday
('a5555555-5555-5555-5555-555555555556', 'c5555555-5555-5555-5555-555555555555', 2, '05:00:00', '23:00:00', 90), -- Tuesday
('a5555555-5555-5555-5555-555555555557', 'c5555555-5555-5555-5555-555555555555', 3, '05:00:00', '23:00:00', 90), -- Wednesday
('a5555555-5555-5555-5555-555555555558', 'c5555555-5555-5555-5555-555555555555', 4, '05:00:00', '23:00:00', 90), -- Thursday
('a5555555-5555-5555-5555-555555555559', 'c5555555-5555-5555-5555-555555555555', 5, '05:00:00', '23:00:00', 90), -- Friday
('a5555555-5555-5555-5555-555555555560', 'c5555555-5555-5555-5555-555555555555', 6, '05:00:00', '23:00:00', 90), -- Saturday
('a5555555-5555-5555-5555-555555555561', 'c5555555-5555-5555-5555-555555555555', 0, '05:00:00', '23:00:00', 90); -- Sunday

-- Add some pending facilities for testing
INSERT INTO public.facilities (id, owner_id, name, city, address, latitude, longitude, sport, price_per_hour, description, status) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a49e0e97-71d8-4d48-808b-aa531abc60cf', 'Dahisar New Cricket Ground', 'Mumbai', 'Dahisar West, Mumbai, Maharashtra', 19.2500, 72.8500, 'cricket', 900, 'Newly opened cricket facility awaiting approval', 'pending'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '0ef6e723-5254-4188-a20a-e03a63f5ae92', 'Vasai Elite Badminton Center', 'Mumbai', 'Vasai West, Mumbai, Maharashtra', 19.3833, 72.8167, 'badminton', 500, 'Premium badminton facility under review', 'pending');
