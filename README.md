Sports Booking App (MVP)

Stack: Next.js (App Router) + Supabase (Auth, DB, Storage)

Getting Started

1. Copy env vars

Create `.env.local` using the example below:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

2. Run the dev server

```bash
npm run dev
```

Open `http://localhost:3000` to view.

Features (MVP)

- User: Signup/Login (email OTP), search courts, view details, book slot, history
- Owner: Create turf, courts, manage availability, manage bookings
- Admin: Approve turfs, manage users/bookings/turfs

Notes

- Phase 2: Razorpay payments, Leaderboard
- Prevent double-booking via Postgres constraint
