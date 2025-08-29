import { NextRequest, NextResponse } from 'next/server';
import { updateFeedback } from '@/lib/db';
import { FeedbackRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { linkId, feedback }: FeedbackRequest = await request.json();
    
    if (!linkId || !feedback) {
      return NextResponse.json(
        { error: 'Link ID and feedback are required' }, 
        { status: 400 }
      );
    }

    if (feedback !== 'like' && feedback !== 'discard') {
      return NextResponse.json(
        { error: 'Feedback must be either "like" or "discard"' }, 
        { status: 400 }
      );
    }

    const result = updateFeedback(linkId, feedback);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Link not found' }, 
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Link ${feedback === 'like' ? 'liked' : 'discarded'} successfully` 
    });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}