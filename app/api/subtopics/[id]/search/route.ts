import { NextRequest, NextResponse } from 'next/server'
import { searchOperations, linkOperations } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const subtopicId = parseInt(params.id)
    
    if (isNaN(subtopicId)) {
      return NextResponse.json(
        { error: 'Invalid subtopic ID' },
        { status: 400 }
      )
    }

    const { query, description } = await request.json()
    
    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    // Create a search record associated with the subtopic
    const searchRecord = await searchOperations.create(
      query,
      undefined, // search_keywords
      undefined, // topic_id - we're using subtopic instead
      description
    )

    // For now, just return success
    // The actual search streaming should be handled by search-stream endpoint
    return NextResponse.json({
      searchId: searchRecord.id,
      subtopicId: subtopicId,
      query: query,
      description: description
    })
  } catch (error) {
    console.error('Error creating subtopic search:', error)
    return NextResponse.json(
      { error: 'Failed to create search' },
      { status: 500 }
    )
  }
}