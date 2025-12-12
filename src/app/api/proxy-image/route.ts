import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to proxy Google Drive images
 * This bypasses CORS restrictions by fetching images server-side
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json(
      { error: 'Missing image URL parameter' },
      { status: 400 }
    );
  }

  // Only allow Google Drive URLs for security
  if (!imageUrl.includes('drive.google.com')) {
    return NextResponse.json(
      { error: 'Only Google Drive URLs are allowed' },
      { status: 400 }
    );
  }

  // Extract cache-busting parameters to ensure unique cache keys
  const playerName = searchParams.get('_player');
  const playerIdx = searchParams.get('_idx');
  const cacheKey = playerName && playerIdx ? `${imageUrl}-${playerName}-${playerIdx}` : imageUrl;

  try {
    // Fetch the image from Google Drive
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return the image with proper headers
    // Disable caching to prevent showing wrong images for different players
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', // Disable all caching
        'Pragma': 'no-cache', // HTTP 1.0 compatibility
        'Expires': '0', // HTTP 1.0 compatibility
        'Access-Control-Allow-Origin': '*', // Allow CORS
        'Vary': '*', // Ensure cache varies by all request headers
      },
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    );
  }
}

