import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { 
      hubName, 
      hubDescription, 
      topicName, 
      topicDescription, 
      subtopicName, 
      subtopicDescription 
    } = await request.json()
    
    if (!topicName) {
      return NextResponse.json({ error: 'Topic name is required' }, { status: 400 })
    }

    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })

    const contextText = subtopicName ? 
      `- Hub Name: ${hubName || 'Not provided'}
- Hub Description: ${hubDescription || 'Not provided'}
- Topic Name: ${topicName}
- Topic Description: ${topicDescription || 'Not provided'}
- Subtopic Name: ${subtopicName}
- Subtopic Description: ${subtopicDescription || 'Not provided'}

Create the most effective 2-4 word Giphy search query that will return relevant, high-quality GIFs/images for this subtopic within this topic and hub context.` :
      `- Hub Name: ${hubName || 'Not provided'}
- Hub Description: ${hubDescription || 'Not provided'}
- Topic Name: ${topicName}
- Topic Description: ${topicDescription || 'Not provided'}

Create the most effective 2-4 word Giphy search query that will return relevant, high-quality GIFs/images for this topic within this hub context.`

    const prompt = `You are an expert at creating optimal search queries for Giphy (animated GIFs and images).

Given the following context:
${contextText}

Guidelines:
- Keep it short (2-4 words maximum)
- Focus on visual, searchable terms
- Consider the hub context for relevance
- Use terms that are likely to have good GIFs on Giphy
- Avoid overly specific or technical terms
- Think about what would make a good visual representation

Examples:
- For "Fan Art" in "Olympique de Marseille" hub → "marseille football fans"
- For "Training Tips" in "Hyrox" hub → "hyrox training"
- For "Gear Needed" in "Hyrox" hub → "fitness equipment"
- For "Match Discussions" in "Barcelona FC" hub → "barcelona celebration"
- For "Recovery Methods" in "Fitness" hub → "recovery massage"

Return ONLY the search query, nothing else.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Use GPT-4o (GPT-4 omni) which is the latest and most capable
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 20,
      temperature: 0.3
    })

    const query = response.choices[0]?.message?.content?.trim()
    
    if (!query) {
      return NextResponse.json({ error: 'Failed to generate query' }, { status: 500 })
    }

    return NextResponse.json({ query })

  } catch (error) {
    console.error('Error generating Giphy query:', error)
    return NextResponse.json({ 
      error: 'Failed to generate optimal search query',
      fallback: true 
    }, { status: 500 })
  }
}