import { NextRequest, NextResponse } from 'next/server'
import { topicOperations } from '@/lib/supabase'

// GET /api/topics/[id] - Get topic with hub info
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const topicId = parseInt(params.id)
    
    if (isNaN(topicId)) {
      return NextResponse.json(
        { error: 'Invalid topic ID' },
        { status: 400 }
      )
    }

    const result = await topicOperations.getById(topicId)
    
    if (!result) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      )
    }

    // Extract topic and hub from the joined result
    const { hub, ...topic } = result
    
    return NextResponse.json({ topic, hub })
  } catch (error) {
    console.error('Error fetching topic:', error)
    return NextResponse.json(
      { error: 'Failed to fetch topic' },
      { status: 500 }
    )
  }
}