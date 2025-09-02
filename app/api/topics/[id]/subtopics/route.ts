import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/topics/[id]/subtopics - Get subtopics for a topic
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

    // Get subtopics for this topic
    const { data: subtopics, error } = await supabase
      .from('subtopics')
      .select('*')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching subtopics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subtopics' },
        { status: 500 }
      )
    }

    return NextResponse.json(subtopics || [])
  } catch (error) {
    console.error('Error in topics/[id]/subtopics GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}