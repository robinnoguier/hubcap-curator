import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import fs from 'fs/promises'
import path from 'path'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface SubtopicSuggestion {
  name: string
  description: string
}

// POST /api/subtopics/suggestions - Generate subtopic suggestions for a topic
export async function POST(request: NextRequest) {
  try {
    const { 
      hubName, 
      hubDescription, 
      topicName, 
      topicDescription, 
      subtopicDescription,
      excludeSubtopics = [] 
    } = await request.json()
    
    if (!hubName || !topicName || !subtopicDescription) {
      return NextResponse.json(
        { error: 'Hub name, topic name, and subtopic description are required' },
        { status: 400 }
      )
    }

    // Check if this is an exhaustive request (asking for "all the X")
    const isExhaustiveRequest = /\b(all|every|complete|exhaustive|comprehensive)\b/i.test(subtopicDescription)
    const maxCount = isExhaustiveRequest ? 25 : 10

    // Load the GPT-5 optimized prompt template
    const promptPath = path.join(process.cwd(), 'prompts', 'subtopic-generation.md')
    let promptTemplate: string
    
    try {
      promptTemplate = await fs.readFile(promptPath, 'utf-8')
    } catch (error) {
      console.error('Error loading prompt template:', error)
      // Fallback to inline prompt if file not found
      promptTemplate = `Generate subtopics based on: {{subtopicDescription}}`
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
      .replace(/{{excludeSubtopics}}/g, excludeSubtopics.join(', '))

    // User prompt requesting object format for JSON mode
    const userPrompt = `Generate ${maxCount} subtopics for:
Hub: ${hubName}
Topic: ${topicName}
Request: ${subtopicDescription}

Return a JSON object with a "suggestions" array containing the subtopics.`

    // Call OpenAI API with GPT-5 settings
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview', // Using GPT-4-turbo for better JSON mode support
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
      temperature: 0.2, // Lower temperature for more deterministic output
      top_p: 0.9, // Nucleus sampling parameter
      response_format: { type: "json_object" }
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      return NextResponse.json(
        { error: 'Failed to generate subtopic suggestions' },
        { status: 500 }
      )
    }

    // Parse the JSON response - GPT-5 should return clean JSON array
    let suggestions: SubtopicSuggestion[] = []
    try {
      // GPT-5 with strict instructions should return a clean JSON array
      // But handle wrapped responses just in case
      const parsed = JSON.parse(response)
      
      if (Array.isArray(parsed)) {
        suggestions = parsed
      } else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        suggestions = parsed.suggestions
      } else if (parsed.subtopics && Array.isArray(parsed.subtopics)) {
        suggestions = parsed.subtopics
      } else {
        // If it's a single object, wrap it in an array
        if (parsed.name && parsed.description) {
          suggestions = [parsed]
        } else {
          // Try to find any array in the object
          const arrays = Object.values(parsed).filter(v => Array.isArray(v))
          if (arrays.length > 0) {
            suggestions = arrays[0] as SubtopicSuggestion[]
          } else {
            throw new Error('No valid suggestions found in response')
          }
        }
      }

      // Validate the response format
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        throw new Error('Invalid response format or empty suggestions')
      }

      // Validate each suggestion
      suggestions = suggestions.filter(suggestion => 
        suggestion && 
        typeof suggestion.name === 'string' && 
        typeof suggestion.description === 'string' &&
        suggestion.name.trim().length > 0 &&
        suggestion.description.trim().length > 0
      ).slice(0, maxCount) // Ensure we don't have more than max count

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      console.error('AI Response:', response)
      
      return NextResponse.json(
        { error: 'Failed to parse subtopic suggestions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      suggestions,
      isExhaustive: isExhaustiveRequest,
      maxReached: suggestions.length >= maxCount
    })

  } catch (error) {
    console.error('Error generating subtopic suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate subtopic suggestions' },
      { status: 500 }
    )
  }
}