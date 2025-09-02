import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('OpenAI API key not configured')
    return null
  }
  return new OpenAI({ apiKey })
}

export async function POST(request: NextRequest) {
  try {
    const { hubName, hubDescription } = await request.json()
    
    if (!hubName) {
      return NextResponse.json(
        { error: 'Hub name is required' },
        { status: 400 }
      )
    }

    const openai = getOpenAIClient()
    
    if (!openai) {
      // Fallback to basic suggestions if AI not available
      return NextResponse.json({
        suggestions: [
          `${hubName} Enthusiasts`,
          `${hubName} Community`,
          `${hubName} Collective`
        ]
      })
    }

    const prompt = `Generate 3 creative, fun plural nicknames for members of a hub/community called "${hubName}".
${hubDescription ? `The hub is about: ${hubDescription}` : ''}

Examples of good nicknames:
- For "Taylor Swift" hub: Swifties
- For "BlackPink" hub: Blinks  
- For "Sneakers" hub: Sneakerheads
- For "Running" hub: Runners
- For "Crypto" hub: Hodlers
- For "Star Wars" hub: Jedis
- For "Marvel" hub: Marvelites
- For "Coffee" hub: Brewers
- For "Gaming" hub: Gamers
- For "Fitness" hub: Athletes

Be creative and specific to the hub topic. Make them catchy, memorable, and always PLURAL.
Return ONLY a JSON array with exactly 3 nickname suggestions, nothing else.
Example response: ["Nickname1", "Nickname2", "Nickname3"]`

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a creative naming expert who comes up with catchy, fun community nicknames. Always respond with ONLY a JSON array of 3 strings.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 100
    })

    const response = completion.choices[0]?.message?.content?.trim()
    
    if (!response) {
      throw new Error('No response from AI')
    }

    // Parse the JSON response
    let suggestions: string[]
    try {
      suggestions = JSON.parse(response)
      if (!Array.isArray(suggestions) || suggestions.length !== 3) {
        throw new Error('Invalid response format')
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', response)
      // Fallback suggestions
      suggestions = [
        `${hubName} Members`,
        `${hubName} Community`,
        `${hubName} Enthusiasts`
      ]
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Error generating hub nicknames:', error)
    // Return fallback suggestions on error
    const { hubName } = await request.json().catch(() => ({ hubName: 'Hub' }))
    return NextResponse.json({
      suggestions: [
        `${hubName} Members`,
        `${hubName} Community`,
        `${hubName} Enthusiasts`
      ]
    })
  }
}