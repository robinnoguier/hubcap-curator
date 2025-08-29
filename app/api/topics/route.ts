import { NextRequest, NextResponse } from 'next/server'
import { topicOperations } from '@/lib/supabase'

// POST /api/topics - Create a new topic
export async function POST(request: NextRequest) {
  try {
    const { hubId, name, description } = await request.json()
    
    if (!hubId || !name) {
      return NextResponse.json(
        { error: 'Hub ID and topic name are required' },
        { status: 400 }
      )
    }

    const topic = await topicOperations.create(hubId, name, description)
    return NextResponse.json(topic, { status: 201 })
  } catch (error) {
    console.error('Error creating topic:', error)
    return NextResponse.json(
      { error: 'Failed to create topic' },
      { status: 500 }
    )
  }
}