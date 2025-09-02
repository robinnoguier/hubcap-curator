import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const limit = searchParams.get('limit') || '1'
  const offset = searchParams.get('offset') || '0'
  
  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
  }

  const apiKey = process.env.GIPHY_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({ error: 'Giphy API key not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=g&lang=en&bundle=messaging_non_clips`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 429) {
        return NextResponse.json({ 
          error: 'Giphy API rate limit exceeded', 
          message: 'Too many requests. Please try again later.',
          rateLimited: true
        }, { status: 429 })
      }
      
      // Try to get error details from response
      let errorMessage = `Giphy API error: ${response.status}`
      try {
        const errorText = await response.text()
        if (errorText.includes('<!DOCTYPE')) {
          // HTML error response (likely rate limit)
          errorMessage = 'Giphy API rate limit exceeded or service unavailable'
        }
      } catch (e) {
        // Ignore parsing errors
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        rateLimited: response.status === 429
      }, { status: response.status })
    }

    const data = await response.json()
    
    if (data.data && data.data.length > 0) {
      if (limit === '1') {
        // Return single image with ID for deduplication
        const gif = data.data[0]
        return NextResponse.json({ 
          imageUrl: gif.images.fixed_width_small.url,
          imageId: gif.id,
          imageTitle: gif.title
        })
      } else {
        // Return multiple images with their IDs and URLs
        const images = data.data.map((gif: any) => ({
          id: gif.id,
          url: gif.images.fixed_width_small.url,
          title: gif.title
        }))
        return NextResponse.json({ images })
      }
    }
    
    if (limit === '1') {
      return NextResponse.json({ imageUrl: null })
    } else {
      return NextResponse.json({ images: [] })
    }
  } catch (error) {
    console.error('Error fetching from Giphy:', error)
    
    // Check if it's a JSON parsing error (likely rate limit HTML response)
    if (error instanceof Error && error.message.includes('Unexpected token')) {
      return NextResponse.json({ 
        error: 'Giphy API rate limit exceeded',
        message: 'The Giphy API is currently rate limited. Images will be unavailable temporarily.',
        rateLimited: true
      }, { status: 429 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch from Giphy',
      message: 'Unable to load images from Giphy service'
    }, { status: 500 })
  }
}