import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Simple search-stream endpoint working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Simple streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send a simple message
        const data = JSON.stringify({
          type: 'result',
          category: 'test',
          result: { title: 'Test Result', url: 'https://example.com', snippet: 'This is a test' }
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        
        // Close the stream
        setTimeout(() => {
          controller.close();
        }, 1000);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: (error as any)?.message || 'Unknown error'
    }, { status: 500 });
  }
}