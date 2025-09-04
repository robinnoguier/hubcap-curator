import { NextRequest, NextResponse } from 'next/server';
import { subtopicMetadataGenerator } from '../../../../lib/subtopic-metadata-generator';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SubtopicSuggestion {
  name: string;
  description: string;
}

// POST /api/subtopics/generate-with-metadata - Complete workflow from description to subtopics with metadata
export async function POST(request: NextRequest) {
  try {
    const { 
      hubName, 
      hubDescription, 
      topicName, 
      topicDescription, 
      subtopicDescription,
      excludeSubtopics = [],
      locale = { region: 'US', language: 'en' }
    } = await request.json();
    
    if (!hubName || !topicName || !subtopicDescription) {
      return NextResponse.json(
        { error: 'Hub name, topic name, and subtopic description are required' },
        { status: 400 }
      );
    }

    // Step 1: Generate basic subtopic suggestions first
    const isExhaustiveRequest = /\b(all|every|complete|exhaustive|comprehensive)\b/i.test(subtopicDescription);
    const maxCount = isExhaustiveRequest ? 25 : 10;

    // Load the GPT-5 optimized prompt template
    const promptPath = path.join(process.cwd(), 'prompts', 'subtopic-generation.md');
    let promptTemplate: string;
    
    try {
      promptTemplate = await fs.readFile(promptPath, 'utf-8');
    } catch (error) {
      console.error('Error loading prompt template:', error);
      // Fallback to inline prompt if file not found
      promptTemplate = `Generate subtopics based on: {{subtopicDescription}}`;
    }

    // Replace template variables for GPT-5 prompt
    const systemPrompt = promptTemplate
      .replace(/{{hubName}}/g, hubName)
      .replace(/{{hubDescription}}/g, hubDescription || 'Not specified')
      .replace(/{{topicName}}/g, topicName)
      .replace(/{{topicDescription}}/g, topicDescription || 'Not specified')
      .replace(/{{subtopicDescription}}/g, subtopicDescription)
      .replace(/{{count}}/g, maxCount.toString())
      .replace(/{{maxSubtopics}}/g, '25')
      .replace(/{{excludeSubtopics}}/g, excludeSubtopics.join(', '));

    // User prompt requesting object format for JSON mode
    const userPrompt = `Generate ${maxCount} subtopics for:
Hub: ${hubName}
Topic: ${topicName}
Request: ${subtopicDescription}

Return a JSON object with a "suggestions" array containing the subtopics.`;

    // Call OpenAI API to generate basic subtopics
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.2,
      top_p: 0.9,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      return NextResponse.json(
        { error: 'Failed to generate subtopic suggestions' },
        { status: 500 }
      );
    }

    // Parse the JSON response for basic subtopics
    let suggestions: SubtopicSuggestion[] = [];
    try {
      const parsed = JSON.parse(response);
      
      if (Array.isArray(parsed)) {
        suggestions = parsed;
      } else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        suggestions = parsed.suggestions;
      } else if (parsed.subtopics && Array.isArray(parsed.subtopics)) {
        suggestions = parsed.subtopics;
      } else {
        if (parsed.name && parsed.description) {
          suggestions = [parsed];
        } else {
          const arrays = Object.values(parsed).filter(v => Array.isArray(v));
          if (arrays.length > 0) {
            suggestions = arrays[0] as SubtopicSuggestion[];
          } else {
            throw new Error('No valid suggestions found in response');
          }
        }
      }

      // Validate and filter suggestions
      suggestions = suggestions.filter(suggestion => 
        suggestion && 
        typeof suggestion.name === 'string' && 
        typeof suggestion.description === 'string' &&
        suggestion.name.trim().length > 0 &&
        suggestion.description.trim().length > 0
      ).slice(0, maxCount);

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse subtopic suggestions' },
        { status: 500 }
      );
    }

    // Step 2: Generate metadata for the subtopics
    const candidateSubtopics = suggestions.map(s => s.name);
    
    const metadataResult = await subtopicMetadataGenerator.generateSubtopicsWithMetadata({
      hub: {
        name: hubName,
        description: hubDescription,
        tags: []
      },
      topic: {
        name: topicName,
        description: topicDescription
      },
      context_examples: [],
      candidate_subtopics: candidateSubtopics,
      locale
    });

    // Step 3: Merge basic suggestions with metadata
    const enhancedSubtopics = suggestions.map(suggestion => {
      const metadataSubtopic = metadataResult.subtopics.find(
        ms => ms.name === suggestion.name
      );
      
      return {
        name: suggestion.name,
        description: suggestion.description,
        normalized_name: metadataSubtopic?.normalized_name || suggestion.name.toLowerCase().replace(/\s+/g, '_'),
        metadata: metadataSubtopic?.metadata || {}
      };
    });

    return NextResponse.json({
      // Basic subtopic response (for backward compatibility)
      suggestions: suggestions,
      isExhaustive: isExhaustiveRequest,
      maxReached: suggestions.length >= maxCount,
      
      // Enhanced metadata response
      inferred_type: metadataResult.inferred_type,
      confidence: metadataResult.confidence,
      schema: metadataResult.schema,
      subtopics: enhancedSubtopics,
      rationales: metadataResult.rationales
    });

  } catch (error) {
    console.error('Error generating subtopics with metadata:', error);
    return NextResponse.json(
      { error: 'Failed to generate subtopics with metadata' },
      { status: 500 }
    );
  }
}