import { NextRequest, NextResponse } from 'next/server';
import { subtopicMetadataGenerator, SubtopicGenerationInput } from '../../../../lib/subtopic-metadata-generator';

// POST /api/subtopics/suggestions-with-metadata - Generate type-aware subtopic suggestions with metadata
export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    
    const { 
      hub,
      topic, 
      context_examples = [],
      candidate_subtopics = [],
      locale = { region: 'US', language: 'en' }
    } = requestBody;
    
    // Validate required inputs
    if (!hub?.name || !topic?.name || !candidate_subtopics?.length) {
      return NextResponse.json(
        { error: 'Hub name, topic name, and candidate subtopics are required' },
        { status: 400 }
      );
    }

    // If candidate_subtopics is a string (user description), we need to generate them first
    if (typeof candidate_subtopics === 'string') {
      return NextResponse.json(
        { 
          error: 'This endpoint expects pre-generated candidate subtopics. Use /api/subtopics/suggestions first to generate subtopics, then call this endpoint with the results.' 
        },
        { status: 400 }
      );
    }

    // Prepare input for metadata generator
    const input: SubtopicGenerationInput = {
      hub: {
        name: hub.name,
        description: hub.description,
        tags: hub.tags || []
      },
      topic: {
        name: topic.name,
        description: topic.description
      },
      context_examples,
      candidate_subtopics: Array.isArray(candidate_subtopics) 
        ? candidate_subtopics 
        : [candidate_subtopics],
      locale
    };

    // Generate subtopics with metadata
    const result = await subtopicMetadataGenerator.generateSubtopicsWithMetadata(input);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error generating subtopics with metadata:', error);
    return NextResponse.json(
      { error: 'Failed to generate subtopic suggestions with metadata' },
      { status: 500 }
    );
  }
}

// GET /api/subtopics/suggestions-with-metadata - Get schema information for a specific entity type
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('type') as any;

    if (!entityType) {
      return NextResponse.json(
        { error: 'Entity type parameter is required' },
        { status: 400 }
      );
    }

    // Return schema for the requested entity type
    const validTypes = ['person', 'event', 'product', 'organization', 'location', 'media', 'animal', 'information', 'other'];
    
    if (!validTypes.includes(entityType)) {
      return NextResponse.json(
        { error: `Invalid entity type. Valid types: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Create a dummy input to generate schema
    const dummyInput: SubtopicGenerationInput = {
      hub: { name: 'Test Hub' },
      topic: { name: 'Test Topic' },
      candidate_subtopics: ['Test Subtopic']
    };

    // Generate just the schema info
    const generator = subtopicMetadataGenerator;
    const result = await generator.generateSubtopicsWithMetadata(dummyInput);

    return NextResponse.json({
      entity_type: entityType,
      schema: result.schema,
      rationales: result.rationales
    });

  } catch (error) {
    console.error('Error getting schema information:', error);
    return NextResponse.json(
      { error: 'Failed to get schema information' },
      { status: 500 }
    );
  }
}