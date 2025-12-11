# Google Drive Setup Guide for Player Photos

## Quick Setup

### Step 1: Upload Images to Google Drive
1. Upload your JPEG images to Google Drive
2. Organize them in a folder (optional)

### Step 2: Make Files Publicly Accessible
For each image:
1. **Right-click** the file → **Share**
2. Click **"Change"** next to access settings
3. Select **"Anyone with the link"**
4. Set permission to **"Viewer"** (read-only)
5. Click **"Done"**

### Step 3: Get Share Links
1. Right-click file → **Share** → **Copy link**
2. You'll get a link like:
   ```
   https://drive.google.com/file/d/1ABC123xyz/view?usp=sharing
   ```
   or
   ```
   https://drive.google.com/open?id=1ABC123xyz
   ```

### Step 4: Use in Database
Store the Google Drive share link directly in the database:
```sql
INSERT INTO auction_player_pool (..., photo, ...)
VALUES (..., 'https://drive.google.com/file/d/1ABC123xyz/view?usp=sharing', ...);
```

## How It Works

✅ **You store:** Google Drive share links  
✅ **App converts:** Automatically to direct image URLs  
✅ **App displays:** Images correctly  

The conversion happens automatically when the auction page loads - no manual conversion needed!

## Supported Link Formats

All these formats work:
- `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`
- `https://drive.google.com/open?id=FILE_ID`
- `https://drive.google.com/d/FILE_ID`

## Troubleshooting

**Image not showing?**
- Check if file is publicly accessible (see Step 2)
- Test the converted URL manually:
  ```
  https://drive.google.com/uc?export=view&id=FILE_ID
  ```
- If you see "Sign in" page → File is not public

**File ID extraction:**
- The app automatically extracts the file ID from any Google Drive link format
- No need to manually convert links

