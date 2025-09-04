import OpenAI from 'openai';

export interface QueryContext {
  hub: {
    name: string;
    description?: string;
    tags?: string[];
  };
  topic: {
    name: string;
    description?: string;
  };
  subtopic?: {
    name: string;
    description?: string;
  };
  additionalContext?: string; // User's specific context/requirements
  existingTitles?: string[];
  audience?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  intent?: 'learn' | 'buy' | 'watch' | 'inspire' | 'news' | 'howto' | 'meme';
  region?: string; // ISO code
  language?: string; // ISO code
  recencyDays?: number;
  platform: 'youtube' | 'reddit' | 'pinterest' | 'images' | 'tenor' | 'giphy' | 'perplexity' | 'openai';
}

export interface PlatformQuery {
  platform: string;
  q: string;
  must_include?: string[];
  must_not?: string[];
  operators?: string[];
  time_filter?: string;
  region?: string;
  language?: string;
  notes?: string;
}

export interface QueryBuilderResponse {
  queries: PlatformQuery[];
  alternates?: string[];
  reasoning?: string;
}

const QUERY_BUILDER_PROMPT = `You are a search query optimizer for external media APIs. Given hub, topic, subtopic, ADDITIONAL CONTEXT (most important - this is the user's specific request that MUST be incorporated), audience, intent, region/lang, recency, and existing titles, output JSON only. Craft platform-specific queries that maximize precision and freshness, avoid duplicates, and reflect the user's language/region. The additional context is CRITICAL and must be the primary focus of the query. Prefer concise keywords + operators. Include up to 3 queries and 2–5 alternates. No prose beyond the JSON fields.

Platform-specific guidelines:
- YouTube: Use operators like intitle:, after:, site:youtube.com/shorts for Shorts
- Reddit: Use site:reddit.com, r/{subreddit}, flair:
- Pinterest: Focus on "ideas", "inspiration", visual terms
- Images: Add visual descriptors, "wallpaper", "concept art", etc.
- Tenor/Giphy: Short mood-based queries (≤4 tokens)
- Perplexity/OpenAI: Natural language questions work best

Return ONLY valid JSON matching this schema:
{
  "queries": [
    {
      "platform": string,
      "q": string,
      "must_include": string[],
      "must_not": string[],
      "operators": string[],
      "time_filter": string,
      "region": string,
      "language": string,
      "notes": string
    }
  ],
  "alternates": string[],
  "reasoning": string
}`;

export class QueryBuilder {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  private fallbackQuery(context: QueryContext): QueryBuilderResponse {
    // Fallback to simple concatenation if OpenAI is unavailable
    const parts = [
      context.subtopic?.name,
      context.topic.name,
      context.hub.name
    ].filter(Boolean);
    
    // CRITICAL: Include additional context if provided
    const baseQuery = context.additionalContext 
      ? `${parts.join(' ')} ${context.additionalContext}`
      : parts.join(' ');
    
    // Add platform-specific tweaks
    let query = baseQuery;
    if (context.platform === 'youtube' && context.intent === 'learn') {
      query = `${baseQuery} tutorial`;
    } else if (context.platform === 'reddit') {
      query = `site:reddit.com ${baseQuery}`;
    } else if (context.platform === 'pinterest') {
      query = `${baseQuery} ideas`;
    }
    
    return {
      queries: [{
        platform: context.platform,
        q: query,
        must_include: parts as string[],
        must_not: [],
        operators: [],
        notes: 'Fallback query'
      }],
      alternates: [baseQuery],
      reasoning: 'Using fallback query generation'
    };
  }

  async buildQuery(context: QueryContext): Promise<QueryBuilderResponse> {
    // If no OpenAI key, use fallback
    if (!this.openai) {
      return this.fallbackQuery(context);
    }

    try {
      // Build the context message
      const contextMessage = `
HUB:
- name: "${context.hub.name}"
- description: "${context.hub.description || 'N/A'}"
- tags: [${context.hub.tags?.join(', ') || ''}]

TOPIC:
- name: "${context.topic.name}"
- description: "${context.topic.description || 'N/A'}"

${context.subtopic ? `SUBTOPIC:
- name: "${context.subtopic.name}"
- description: "${context.subtopic.description || 'N/A'}"` : ''}

${context.additionalContext ? `ADDITIONAL CONTEXT (CRITICAL - MUST INCORPORATE): "${context.additionalContext}"` : ''}

Audience: ${context.audience || 'general'}
Intent: ${context.intent || 'learn'}
Region: ${context.region || 'US'}
Language: ${context.language || 'en'}
Recency (days): ${context.recencyDays || 0}
${context.existingTitles?.length ? `Existing titles (avoid near-duplicates): ${context.existingTitles.slice(0, 10).join(' | ')}` : ''}

Target platform: ${context.platform}
Return JSON per schema.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: QUERY_BUILDER_PROMPT },
          { role: 'user', content: contextMessage }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(content) as QueryBuilderResponse;
      
      // Validate and ensure we have at least one query
      if (!result.queries || result.queries.length === 0) {
        return this.fallbackQuery(context);
      }

      return result;
    } catch (error) {
      console.error('Error building query with OpenAI:', error);
      return this.fallbackQuery(context);
    }
  }

  // Helper method to extract the best query string for a given platform
  getBestQuery(response: QueryBuilderResponse): string {
    if (response.queries && response.queries.length > 0) {
      return response.queries[0].q;
    }
    return '';
  }

  // Helper to get platform-specific search operators
  getPlatformOperators(platform: string): string[] {
    switch (platform) {
      case 'youtube':
        return ['intitle:', 'after:', 'before:', 'channel:', 'playlist:'];
      case 'reddit':
        return ['site:reddit.com', 'r/', 'flair:', 'author:'];
      case 'images':
        return ['site:', 'filetype:', 'imagesize:'];
      default:
        return [];
    }
  }
}

export const queryBuilder = new QueryBuilder();