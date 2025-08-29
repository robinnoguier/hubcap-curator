import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const limit = searchParams.get('limit') || '1'
  
  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
  }

  const apiKey = process.env.GIPHY_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({ error: 'Giphy API key not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=${limit}&offset=0&rating=g&lang=en&bundle=messaging_non_clips`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Giphy API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.data && data.data.length > 0) {
      if (limit === '1') {
        // Return single image URL for backward compatibility
        const imageUrl = data.data[0].images.fixed_width_small.url
        return NextResponse.json({ imageUrl })
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
    return NextResponse.json({ error: 'Failed to fetch from Giphy' }, { status: 500 })
  }
}