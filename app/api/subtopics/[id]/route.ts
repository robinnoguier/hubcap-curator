import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/subtopics/[id] - Get subtopic by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: subtopic, error } = await supabase
      .from('subtopics')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !subtopic) {
      return NextResponse.json(
        { error: 'Subtopic not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(subtopic)
  } catch (error) {
    console.error('Error fetching subtopic:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subtopic' },
      { status: 500 }
    )
  }
}

// PATCH /api/subtopics/[id] - Update subtopic
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json()
    
    const { data: subtopic, error } = await supabase
      .from('subtopics')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating subtopic:', error)
      return NextResponse.json(
        { error: 'Failed to update subtopic' },
        { status: 500 }
      )
    }

    return NextResponse.json(subtopic)
  } catch (error) {
    console.error('Error updating subtopic:', error)
    return NextResponse.json(
      { error: 'Failed to update subtopic' },
      { status: 500 }
    )
  }
}

// DELETE /api/subtopics/[id] - Delete subtopic
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('subtopics')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting subtopic:', error)
      return NextResponse.json(
        { error: 'Failed to delete subtopic' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting subtopic:', error)
    return NextResponse.json(
      { error: 'Failed to delete subtopic' },
      { status: 500 }
    )
  }
}