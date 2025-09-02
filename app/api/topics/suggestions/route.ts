import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface TopicSuggestion {
  name: string
  description: string
}

// POST /api/topics/suggestions - Generate topic suggestions for a hub
export async function POST(request: NextRequest) {
  try {
    const { hubName, hubDescription, excludeTopics = [] } = await request.json()
    
    if (!hubName) {
      return NextResponse.json(
        { error: 'Hub name is required' },
        { status: 400 }
      )
    }

    // Read the prompt template
    const promptPath = path.join(process.cwd(), 'prompts', 'topic-generation.md')
    let promptTemplate = ''
    
    try {
      promptTemplate = fs.readFileSync(promptPath, 'utf-8')
    } catch (error) {
      console.error('Error reading prompt file:', error)
      return NextResponse.json(
        { error: 'Failed to load prompt template' },
        { status: 500 }
      )
    }

    // Replace template variables for GPT-5 optimized prompt
    const systemPrompt = promptTemplate
      .replace(/{{hubName}}/g, hubName)
      .replace(/{{hubDescription}}/g, hubDescription || 'Not specified')
      .replace(/{{excludeTopics}}/g, excludeTopics.join(', '))
      .replace(/{{#if excludeTopics}}[\s\S]*?{{\/if}}/g, 
        excludeTopics.length > 0 
          ? `Do NOT include these already existing topics:\n${excludeTopics.join(', ')}` 
          : ''
      )
    
    // Simple user prompt for GPT-5 format - explicitly request array in object
    const userPrompt = `Generate 10 topics for Hub: ${hubName}\nDescription: ${hubDescription || 'Not provided'}\n\nReturn a JSON object with a "suggestions" property containing an array of topics.`

    // Call OpenAI API with optimized settings
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview', // Use turbo for topics (o1 models don't support system messages well for simple tasks)
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
      temperature: 0.2, // Lower temperature for consistent results
      top_p: 0.9, // Nucleus sampling
      response_format: { type: "json_object" }
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      return NextResponse.json(
        { error: 'Failed to generate topic suggestions' },
        { status: 500 }
      )
    }

    // Parse the JSON response
    let suggestions: TopicSuggestion[] = []
    try {
      // Parse the response
      const parsed = JSON.parse(response)
      
      // Handle both array and object with suggestions property
      if (Array.isArray(parsed)) {
        suggestions = parsed
      } else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        suggestions = parsed.suggestions
      } else if (parsed.topics && Array.isArray(parsed.topics)) {
        // Sometimes it might use "topics" instead of "suggestions"
        suggestions = parsed.topics
      } else {
        // If it's a single object, wrap it in an array
        if (parsed.name && parsed.description) {
          suggestions = [parsed]
        } else {
          // Try to find any array in the object
          const arrays = Object.values(parsed).filter(v => Array.isArray(v))
          if (arrays.length > 0) {
            suggestions = arrays[0] as TopicSuggestion[]
          } else {
            throw new Error('No valid suggestions found in response')
          }
        }
      }

      // Validate the response format
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        throw new Error('Invalid response format - no suggestions array found')
      }

      // Validate each suggestion
      suggestions = suggestions.filter(suggestion => 
        suggestion && 
        typeof suggestion.name === 'string' && 
        typeof suggestion.description === 'string' &&
        suggestion.name.trim().length > 0 &&
        suggestion.description.trim().length > 0
      ).slice(0, 10) // Ensure we don't have more than 10

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      console.error('AI Response:', response)
      
      return NextResponse.json(
        { error: 'Failed to parse topic suggestions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ suggestions })

  } catch (error) {
    console.error('Error generating topic suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate topic suggestions' },
      { status: 500 }
    )
  }
}