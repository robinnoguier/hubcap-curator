import { NextRequest, NextResponse } from 'next/server'
import { hubOperations } from '@/lib/supabase'

// GET /api/hubs/[id] - Get hub with its topics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hubId = parseInt(params.id)
    
    if (isNaN(hubId)) {
      return NextResponse.json(
        { error: 'Invalid hub ID' },
        { status: 400 }
      )
    }

    const result = await hubOperations.getWithTopics(hubId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching hub:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hub' },
      { status: 500 }
    )
  }
}

// PATCH /api/hubs/[id] - Update hub
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hubId = parseInt(params.id)
    
    if (isNaN(hubId)) {
      return NextResponse.json(
        { error: 'Invalid hub ID' },
        { status: 400 }
      )
    }

    const { name, description, imageUrl, color } = await request.json()
    
    if (!name) {
      return NextResponse.json(
        { error: 'Hub name is required' },
        { status: 400 }
      )
    }

    const hub = await hubOperations.update(hubId, name, description, imageUrl, color)
    return NextResponse.json(hub)
  } catch (error) {
    console.error('Error updating hub:', error)
    return NextResponse.json(
      { error: 'Failed to update hub' },
      { status: 500 }
    )
  }
}

// DELETE /api/hubs/[id] - Delete hub and all related data
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hubId = parseInt(params.id)
    
    if (isNaN(hubId)) {
      return NextResponse.json(
        { error: 'Invalid hub ID' },
        { status: 400 }
      )
    }

    await hubOperations.delete(hubId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting hub:', error)
    return NextResponse.json(
      { error: 'Failed to delete hub' },
      { status: 500 }
    )
  }
}