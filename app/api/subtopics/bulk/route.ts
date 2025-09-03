import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/subtopics/bulk - Create multiple subtopics
export async function POST(request: NextRequest) {
  try {
    const { topicId, subtopics } = await request.json()
    
    if (!topicId || !Array.isArray(subtopics) || subtopics.length === 0) {
      return NextResponse.json(
        { error: 'Topic ID and subtopics array are required' },
        { status: 400 }
      )
    }

    // Validate and prepare subtopics data
    const subtopicsData = subtopics.map(subtopic => {
      if (!subtopic.name?.trim()) {
        throw new Error('Each subtopic must have a name')
      }
      
      return {
        topic_id: topicId,
        name: subtopic.name.trim(),
        description: subtopic.description?.trim() || null,
        image_url: subtopic.imageUrl || null,
        color: subtopic.color || null,
        metadata: subtopic.metadata || {}
      }
    })

    // Insert all subtopics
    console.log('Attempting to create subtopics:', subtopicsData)
    
    const { data: createdSubtopics, error } = await supabase
      .from('subtopics')
      .insert(subtopicsData)
      .select()

    if (error) {
      console.error('Error creating subtopics:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json(
        { 
          error: 'Failed to create subtopics',
          details: error.message,
          code: error.code 
        },
        { status: 500 }
      )
    }
    
    console.log('Successfully created subtopics:', createdSubtopics?.length)

    return NextResponse.json(
      { 
        subtopics: createdSubtopics,
        count: createdSubtopics.length 
      }, 
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in subtopics bulk POST:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}