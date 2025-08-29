import { NextRequest, NextResponse } from 'next/server'
import { searchOperations, linkOperations } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '10')

  try {
    const searches = await searchOperations.getRecent(limit)
    return NextResponse.json(searches)
  } catch (error) {
    console.error('Error fetching searches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch searches' },
      { status: 500 }
    )
  }
}

// Get a specific search with its links
export async function POST(request: NextRequest) {
  try {
    const { searchId } = await request.json()
    
    if (!searchId) {
      return NextResponse.json(
        { error: 'Search ID is required' },
        { status: 400 }
      )
    }

    const links = await linkOperations.getBySearch(searchId)
    
    // Group links by category
    const groupedLinks = {
      long_form_videos: links.filter(l => l.category === 'long_form_videos'),
      short_form_videos: links.filter(l => l.category === 'short_form_videos'),
      articles: links.filter(l => l.category === 'articles'),
      podcasts: links.filter(l => l.category === 'podcasts'),
      images: links.filter(l => l.category === 'images')
    }

    return NextResponse.json(groupedLinks)
  } catch (error) {
    console.error('Error fetching search links:', error)
    return NextResponse.json(
      { error: 'Failed to fetch search links' },
      { status: 500 }
    )
  }
}

// Delete a search and all its links
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const searchId = parseInt(searchParams.get('searchId') || '0')
    
    if (!searchId || isNaN(searchId)) {
      return NextResponse.json(
        { error: 'Valid search ID is required' },
        { status: 400 }
      )
    }

    await searchOperations.delete(searchId)
    
    return NextResponse.json({ success: true, message: 'Search and all associated links deleted successfully' })
  } catch (error) {
    console.error('Error deleting search:', error)
    return NextResponse.json(
      { error: 'Failed to delete search' },
      { status: 500 }
    )
  }
}