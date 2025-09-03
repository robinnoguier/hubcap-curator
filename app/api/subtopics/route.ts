import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/subtopics - Create a single subtopic
export async function POST(request: NextRequest) {
  try {
    const { topicId, name, description, imageUrl, color, metadata } = await request.json()
    
    if (!topicId || !name?.trim()) {
      return NextResponse.json(
        { error: 'Topic ID and name are required' },
        { status: 400 }
      )
    }

    // Create the subtopic
    const { data: subtopic, error } = await supabase
      .from('subtopics')
      .insert({
        topic_id: topicId,
        name: name.trim(),
        description: description?.trim() || null,
        image_url: imageUrl || null,
        color: color || null,
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating subtopic:', error)
      return NextResponse.json(
        { error: 'Failed to create subtopic' },
        { status: 500 }
      )
    }

    return NextResponse.json(subtopic, { status: 201 })
  } catch (error) {
    console.error('Error in subtopics POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}