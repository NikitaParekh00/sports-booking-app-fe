# Import Checklist - Fixing UUID Errors

## Common UUID Format Issues:

### ✅ CORRECT Format:
```
f9f8d300-b1ca-410a-9bbf-a3ac1d3cf2de
```
- Lowercase letters (a-f)
- Numbers (0-9)
- Hyphens in correct positions: 8-4-4-4-12
- No quotes around it
- No spaces

### ❌ WRONG Formats:
1. **With quotes:** `"f9f8d300-b1ca-410a-9bbf-a3ac1d3cf2de"` → Remove quotes
2. **No hyphens:** `f9f8d300b1ca410a9bbfa3ac1d3cf2de` → Add hyphens
3. **Uppercase:** `F9F8D300-B1CA-410A-9BBF-A3AC1D3CF2DE` → Convert to lowercase
4. **With spaces:** `f9f8d300 - b1ca - 410a - 9bbf - a3ac1d3cf2de` → Remove spaces
5. **Empty:** `` (empty string) → Must have a valid UUID

## Steps to Fix:

1. **Get a valid session_id:**
   ```sql
   SELECT id FROM public.auction_sessions 
   WHERE is_complete = false 
   ORDER BY created_at DESC LIMIT 1;
   ```

2. **Check your import file:**
   - Make sure `session_id` column exists
   - All rows have the same UUID value
   - UUID is in correct format (see above)
   - No quotes, no spaces, lowercase

3. **If importing via CSV/Excel:**
   - Format the `session_id` column as "Text" (not General)
   - Paste the UUID exactly as shown (no extra characters)
   - Make sure all rows have the same UUID

4. **If already imported with errors:**
   - Run `db/validate_and_fix_uuid.sql` to find invalid UUIDs
   - Update them with a valid session_id

## Quick Fix Query:

```sql
-- Get valid session_id
SELECT id FROM public.auction_sessions 
WHERE is_complete = false 
ORDER BY created_at DESC LIMIT 1;

-- Then update invalid ones (replace YOUR_VALID_UUID)
UPDATE public.auction_player_pool
SET session_id = 'YOUR_VALID_UUID'
WHERE session_id IS NULL 
   OR session_id::text = ''
   OR session_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
```

