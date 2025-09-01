# Setting Up Dummy Data

## Step 1: Create Real Users in Supabase Auth

Before running the dummy data script, you need to create real users in Supabase Auth. Here are a few ways to do this:

### Option A: Create Users via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to Authentication > Users
3. Click "Add user" and create these users:
   - Email: `owner1@example.com` (for Rajesh Kumar)
   - Email: `owner2@example.com` (for Priya Sharma)
   - Email: `owner3@example.com` (for Amit Patel)
   - Email: `owner4@example.com` (for Sneha Reddy)
   - Email: `owner5@example.com` (for Vikram Singh)
   - Email: `player1@example.com` (for Arjun Mehta)
   - Email: `player2@example.com` (for Kavya Nair)
   - Email: `player3@example.com` (for Rohit Gupta)
   - Email: `admin@example.com` (for Admin User)

### Option B: Create Users via SQL (if you have access)
```sql
-- This will create users in auth.users table
-- Note: You'll need to replace these with actual user creation methods
```

## Step 2: Get User IDs

After creating users, get their UUIDs from the Supabase dashboard or by running:
```sql
SELECT id, email FROM auth.users ORDER BY created_at;
```

## Step 3: Update Dummy Data Script

Replace the placeholder UUIDs in `dummy_data.sql` with the real user IDs:

```sql
-- Replace these placeholder UUIDs:
'00000000-0000-0000-0000-000000000001' -- with actual owner1@example.com user ID
'00000000-0000-0000-0000-000000000002' -- with actual owner2@example.com user ID
-- ... and so on
```

## Step 4: Run the Dummy Data Script

1. Open your Supabase SQL Editor
2. Copy and paste the contents of `dummy_data.sql`
3. Update the user IDs with real ones
4. Run the script

## What the Dummy Data Includes

### 🏢 Facilities (11 facilities across 9 sports)
- **Cricket**: Mumbai Cricket Academy, Delhi Sports Complex
- **Badminton**: Shuttle Sports Center (Bangalore), Racquet Club (Pune)
- **Table Tennis**: Ping Pong Palace (Chennai)
- **Shooting**: Precision Shooting Range (Hyderabad)
- **Football**: Goal Masters Arena (Kolkata)
- **Basketball**: Hoops & Dreams (Ahmedabad)
- **Tennis**: Ace Tennis Club (Jaipur)
- **Volleyball**: Spike Zone (Chandigarh)
- **Swimming**: Aqua Sports Center (Goa)

### 🏟️ Courts (25+ courts with different amenities)
- Each facility has 1-6 courts
- Different capacities (1-22 people)
- Various amenities (lights, parking, AC, coaching, etc.)

### ⏰ Availability Rules
- Different schedules for different sports
- Weekday vs weekend availability
- Different time slots and intervals

### 📅 Sample Bookings
- Past completed bookings
- Future confirmed bookings
- Different payment statuses

### 💰 Sample Payments
- Various payment statuses (captured, created, etc.)
- Different amounts based on sport and duration

## Testing Your Setup

After running the dummy data:

1. **Test Location Filtering**: Go to `/dashboard`, set a location, and select a sport
2. **Test Distance Calculation**: Facilities should be sorted by distance
3. **Test Different Sports**: Each sport should show relevant facilities
4. **Test Facility Details**: Click on facilities to see courts and amenities

## Notes

- All facilities have real coordinates for major Indian cities
- Prices are realistic for Indian market (₹200-₹1500/hour)
- Availability rules cover most common time slots
- Some facilities are marked as "pending" for testing approval workflow
- Images use Unsplash URLs (you can replace with your own)

## Troubleshooting

If you get errors:
1. Make sure you've run the main `schema.sql` first
2. Check that user IDs exist in `auth.users` table
3. Verify that RLS policies allow the operations
4. Check that all foreign key references are valid
