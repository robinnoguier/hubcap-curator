import { NextRequest, NextResponse } from 'next/server'
import { hubOperations } from '@/lib/supabase'

// GET /api/hubs - Get all hubs
export async function GET() {
  try {
    const hubs = await hubOperations.getAll()
    return NextResponse.json(hubs)
  } catch (error) {
    console.error('Error fetching hubs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hubs' },
      { status: 500 }
    )
  }
}

// POST /api/hubs - Create a new hub
export async function POST(request: NextRequest) {
  try {
    const { name, description, imageUrl, color, memberNicknamePlural, fakeOnlineCount } = await request.json()
    
    if (!name) {
      return NextResponse.json(
        { error: 'Hub name is required' },
        { status: 400 }
      )
    }

    // Validate and clamp fakeOnlineCount if provided
    let validatedCount = fakeOnlineCount
    if (fakeOnlineCount !== undefined && fakeOnlineCount !== null) {
      validatedCount = Math.max(1, Math.min(150, Math.floor(fakeOnlineCount)))
    }

    // Trim nickname and set to null if empty
    let validatedNickname = memberNicknamePlural
    if (memberNicknamePlural !== undefined && memberNicknamePlural !== null) {
      validatedNickname = memberNicknamePlural.trim()
      if (validatedNickname === '') {
        validatedNickname = null
      }
    }

    const hub = await hubOperations.create(name, description, imageUrl, color, validatedNickname, validatedCount)
    return NextResponse.json(hub, { status: 201 })
  } catch (error) {
    console.error('Error creating hub:', error)
    return NextResponse.json(
      { error: 'Failed to create hub' },
      { status: 500 }
    )
  }
}