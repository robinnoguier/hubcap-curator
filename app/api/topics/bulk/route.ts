import { NextRequest, NextResponse } from 'next/server'
import { topicOperations } from '@/lib/supabase'

interface BulkTopicData {
  name: string
  description?: string
  imageUrl?: string | null
  color?: string | null
}

// POST /api/topics/bulk - Create multiple topics for a hub
export async function POST(request: NextRequest) {
  try {
    const { hubId, topics } = await request.json()
    
    if (!hubId) {
      return NextResponse.json(
        { error: 'Hub ID is required' },
        { status: 400 }
      )
    }

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return NextResponse.json(
        { error: 'Topics array is required and must not be empty' },
        { status: 400 }
      )
    }

    // Validate each topic
    for (const topic of topics) {
      if (!topic.name || typeof topic.name !== 'string' || !topic.name.trim()) {
        return NextResponse.json(
          { error: 'All topics must have a valid name' },
          { status: 400 }
        )
      }
    }

    const createdTopics = []
    const errors = []

    // Create topics one by one to handle individual errors
    for (const topicData of topics) {
      try {
        const topic = await topicOperations.create(
          hubId,
          topicData.name.trim(),
          topicData.description?.trim() || undefined,
          topicData.imageUrl || undefined,
          topicData.color || undefined
        )
        createdTopics.push(topic)
      } catch (error) {
        console.error(`Error creating topic "${topicData.name}":`, error)
        errors.push({
          topic: topicData.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Return success even if some topics failed, but include error information
    return NextResponse.json({
      message: `Successfully created ${createdTopics.length} topics`,
      createdTopics,
      errors: errors.length > 0 ? errors : undefined,
      totalRequested: topics.length,
      totalCreated: createdTopics.length
    })

  } catch (error) {
    console.error('Error in bulk topic creation:', error)
    return NextResponse.json(
      { error: 'Failed to create topics' },
      { status: 500 }
    )
  }
}