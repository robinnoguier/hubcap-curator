import { NextRequest, NextResponse } from 'next/server'
import { searchOperations } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { searchId: string } }
) {
  try {
    const searchId = parseInt(params.searchId)
    
    if (!searchId || isNaN(searchId)) {
      return NextResponse.json(
        { error: 'Valid search ID is required' },
        { status: 400 }
      )
    }

    // Delete the search and all associated links (cascade delete)
    await searchOperations.delete(searchId)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Search and all associated links deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting search:', error)
    return NextResponse.json(
      { error: 'Failed to delete search' },
      { status: 500 }
    )
  }
}