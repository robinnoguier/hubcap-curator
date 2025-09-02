import { NextRequest, NextResponse } from 'next/server'
import { Link } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const { links, context } = await request.json()
    
    if (!links || links.length === 0) {
      return NextResponse.json(
        { error: 'No links provided' },
        { status: 400 }
      )
    }
    
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    
    if (!webhookUrl) {
      console.error('SLACK_WEBHOOK_URL not configured')
      return NextResponse.json(
        { error: 'Slack webhook not configured' },
        { status: 500 }
      )
    }
    
    // Format links for Slack
    const formattedLinks = links.map((link: Link) => {
      const emoji = getEmojiForCategory(link.category)
      return `${emoji} <${link.url}|${link.title}>`
    }).join('\n')
    
    // Build context string
    let contextString = ''
    if (context) {
      const parts = []
      if (context.hub) parts.push(`Hub: *${context.hub}*`)
      if (context.topic) parts.push(`Topic: *${context.topic}*`)
      if (context.subtopic) parts.push(`Subtopic: *${context.subtopic}*`)
      contextString = parts.join(' › ')
    }
    
    // Create Slack message
    const slackMessage = {
      text: `🔗 ${links.length} link${links.length !== 1 ? 's' : ''} shared from Hubcap`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📚 Curated Links (${links.length})`,
            emoji: true
          }
        },
        ...(contextString ? [{
          type: 'context',
          elements: [{
            type: 'mrkdwn',
            text: contextString
          }]
        }] : []),
        {
          type: 'divider'
        },
        ...links.map((link: Link) => ({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: formatLinkForSlack(link)
          }
        }))
      ]
    }
    
    // Send to Slack
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage)
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Slack webhook error:', error)
      return NextResponse.json(
        { error: 'Failed to send to Slack' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending to Slack:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getEmojiForCategory(category: string): string {
  switch (category) {
    case 'long_form_videos':
      return '🎬'
    case 'short_form_videos':
      return '📹'
    case 'articles':
      return '📰'
    case 'podcasts':
      return '🎙️'
    case 'images':
      return '🖼️'
    default:
      return '🔗'
  }
}

function formatLinkForSlack(link: Link): string {
  const emoji = getEmojiForCategory(link.category)
  let text = `${emoji} *<${link.url}|${link.title}>*`
  
  if (link.snippet) {
    const snippet = link.snippet.length > 100 
      ? link.snippet.substring(0, 100) + '...' 
      : link.snippet
    text += `\n_${snippet}_`
  }
  
  if (link.source) {
    text += ` • ${link.source}`
  }
  
  return text
}