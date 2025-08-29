import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import axios from 'axios';
import { insertLink } from '@/lib/db';
import { generateEmbedding, extractLinksFromText, decodeHtmlEntities, fetchOGImage } from '@/lib/utils';
import { AI_PROMPTS } from '@/lib/prompts';
import { Link, YouTubeVideo } from '@/lib/types';
import { searchOperations, linkOperations } from '@/lib/supabase';

// Helper function to build contextual search query
function buildContextualSearchQuery({
  userQuery,
  searchDescription,
  hubName,
  hubDescription,
  topicName,
  topicDescription
}: {
  userQuery: string;
  searchDescription?: string;
  hubName?: string;
  hubDescription?: string;
  topicName?: string;
  topicDescription?: string;
}) {
  let contextParts: string[] = [];
  
  // Add hub context
  if (hubName) {
    contextParts.push(`Hub: ${hubName}`);
    if (hubDescription) {
      contextParts.push(`Hub Focus: ${hubDescription}`);
    }
  }
  
  // Add topic context  
  if (topicName) {
    contextParts.push(`Topic: ${topicName}`);
    if (topicDescription) {
      contextParts.push(`Topic Focus: ${topicDescription}`);
    }
  }
  
  // Add user's search query
  contextParts.push(`Search Query: ${userQuery}`);
  
  // Add additional search description if provided
  if (searchDescription) {
    contextParts.push(`Additional Context: ${searchDescription}`);
  }
  
  const enrichedQuery = contextParts.join(' | ');
  console.log('Enriched search context:', enrichedQuery);
  
  return {
    originalQuery: userQuery,
    enrichedQuery,
    contextParts
  };
}

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export async function GET() {
  return NextResponse.json({ 
    message: 'Search-stream endpoint is running',
    timestamp: new Date().toISOString(),
    env: {
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasYouTube: !!process.env.YOUTUBE_API_KEY,
      hasUnsplash: !!process.env.UNSPLASH_ACCESS_KEY,
      hasPerplexity: !!process.env.PPLX_API_KEY
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('Search-stream POST endpoint called');
    const { 
      topic, 
      topicId,
      hubId,
      searchDescription,
      hubName,
      hubDescription,
      topicName,
      topicDescription
    } = await request.json();
  
  if (!topic) {
    return new Response('Topic is required', { status: 400 });
  }

  // Build enriched context for AI searches
  const contextualTopic = buildContextualSearchQuery({
    userQuery: topic,
    searchDescription,
    hubName,
    hubDescription,
    topicName,
    topicDescription
  });

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      let searchRecord = null;
      let totalLinksCount = 0;
      
      // Create search record in Supabase with full context
      try {
        searchRecord = await searchOperations.create(
          contextualTopic.originalQuery,
          undefined, // search_keywords will be set later
          topicId,
          searchDescription
        );
        console.log('Created search record:', searchRecord.id);
        console.log('With context:', contextualTopic.enrichedQuery);
      } catch (error) {
        console.error('Failed to create search record:', error);
        // Continue without saving to DB
      }
      
      const sendUpdate = async (category: string, links: Link[]) => {
        if (isClosed) {
          console.log(`Skipping update for ${category} - stream already closed`);
          return;
        }
        try {
          // Save links to Supabase if we have a search record
          if (searchRecord && links.length > 0) {
            try {
              await linkOperations.saveMany(searchRecord.id, links);
              totalLinksCount += links.length;
              console.log(`Saved ${links.length} ${category} links to database`);
            } catch (saveError) {
              console.error(`Failed to save ${category} links:`, saveError);
              // Continue without failing the stream
            }
          }
          
          // Send each link individually
          if (!isClosed && links.length > 0) {
            for (const link of links) {
              if (isClosed) break;
              const data = JSON.stringify({ 
                type: 'result',
                result: { ...link, category }
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
        } catch (error) {
          console.error('Error sending update:', error);
          if ((error as any)?.code === 'ERR_INVALID_STATE') {
            isClosed = true;
          }
        }
      };

      try {
        // Start all API calls in parallel with enriched context
        const promises = [
          fetchPerplexityLinks(contextualTopic, 'long_form_videos', sendUpdate),
          fetchPerplexityLinks(contextualTopic, 'short_form_videos', sendUpdate), 
          fetchPerplexityLinks(contextualTopic, 'articles', sendUpdate),
          fetchYouTubeVideos(contextualTopic, sendUpdate),
          fetchYouTubeShorts(contextualTopic, sendUpdate),
          fetchNewsAPI(contextualTopic, sendUpdate),
          fetchPodcasts(contextualTopic, sendUpdate),
          fetchGoogleImages(contextualTopic, sendUpdate)
        ];

        await Promise.allSettled(promises);
        
        // Wait a moment for any remaining async operations
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update total links count in search record
        if (searchRecord && totalLinksCount > 0) {
          try {
            await searchOperations.updateLinkCount(searchRecord.id, totalLinksCount);
            console.log(`Updated search ${searchRecord.id} with total count: ${totalLinksCount}`);
          } catch (error) {
            console.error('Failed to update link count:', error);
          }
        }
        
        // Signal completion
        if (!isClosed) {
          try {
            controller.enqueue(encoder.encode('data: {"type": "done"}\n\n'));
            controller.close();
            isClosed = true;
          } catch (error) {
            console.error('Error closing controller:', error);
          }
        }
      } catch (error) {
        console.error('Stream error:', error);
        if (!isClosed) {
          try {
            controller.error(error);
            isClosed = true;
          } catch (e) {
            console.error('Error signaling error:', e);
          }
        }
      }
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
    console.error('Search-stream POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as any)?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// OpenAI removed since it was generating fake URLs

async function fetchPerplexityLinks(contextualTopic: any, category: string, sendUpdate: Function) {
  const topic = contextualTopic.enrichedQuery; // Use enriched context for search
  if (!process.env.PPLX_API_KEY) return;

  try {
    const prompts = {
      long_form_videos: AI_PROMPTS.PERPLEXITY.BASE(AI_PROMPTS.PERPLEXITY.LONG_FORM_VIDEOS(topic)),
      short_form_videos: AI_PROMPTS.PERPLEXITY.BASE(AI_PROMPTS.PERPLEXITY.SHORT_FORM_VIDEOS(topic)),
      articles: AI_PROMPTS.PERPLEXITY.BASE(AI_PROMPTS.PERPLEXITY.ARTICLES(topic))
    };

    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'sonar',
        messages: [{ role: 'user', content: prompts[category as keyof typeof prompts] }],
        temperature: 0.3,
        max_tokens: 1200
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.PPLX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data.choices[0]?.message?.content || '';
    console.log(`Perplexity ${category} response:`, content.substring(0, 300));
    
    const links = extractLinksFromText(content, 'Perplexity');
    console.log(`Perplexity ${category} extracted ${links.length} links`);
    
    if (links.length > 0) {
      const processedLinks = links.slice(0, 10).map(link => ({
        ...link,
        title: link.title || 'Untitled',
        url: link.url || '',
        snippet: link.snippet || '',
        source: 'Perplexity',
        category
      })) as Link[];

      // Store in database
      for (const link of processedLinks) {
        try {
          if (category === 'articles' && !link.thumbnail) {
            link.thumbnail = await fetchOGImage(link.url);
          }
          const embeddingText = `${link.title} ${link.snippet}`;
          const embedding = await generateEmbedding(embeddingText);
          await insertLink({ ...link, topic, embedding });
        } catch (error) {
          console.error('Error storing link:', error);
        }
      }

      sendUpdate(category, processedLinks);
    }
  } catch (error: any) {
    console.error(`Perplexity ${category} error:`, error.message);
  }
}

async function fetchYouTubeVideos(contextualTopic: any, sendUpdate: Function) {
  // Create a contextual search query by combining original query with key context
  const hubContext = contextualTopic.contextParts.find((p: any) => p.startsWith('Hub:'))?.replace('Hub:', '').trim();
  const topicContext = contextualTopic.contextParts.find((p: any) => p.startsWith('Topic:'))?.replace('Topic:', '').trim();
  
  let searchQuery = contextualTopic.originalQuery;
  if (topicContext) {
    searchQuery += ` ${topicContext}`;
  }
  if (hubContext && hubContext !== topicContext) {
    searchQuery += ` ${hubContext}`;
  }
  
  const topic = searchQuery;
  if (!process.env.YOUTUBE_API_KEY) return;

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: topic,
        type: 'video',
        videoDuration: 'long',
        maxResults: 10,
        key: process.env.YOUTUBE_API_KEY,
        order: 'relevance'
      }
    });

    const videos: any[] = response.data.items || [];
    
    if (videos.length > 0) {
      const links: Link[] = videos.map(video => ({
        title: decodeHtmlEntities(video.snippet.title),
        url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
        snippet: decodeHtmlEntities(video.snippet.description.substring(0, 200)) + '...',
        source: 'YouTube',
        category: 'long_form_videos',
        topic: topic,
        thumbnail: `https://img.youtube.com/vi/${video.id.videoId}/maxresdefault.jpg`
      }));

      // Store in database
      for (const link of links) {
        try {
          const embeddingText = `${link.title} ${link.snippet}`;
          const embedding = await generateEmbedding(embeddingText);
          await insertLink({ ...link, topic, embedding });
        } catch (error) {
          console.error('Error storing link:', error);
        }
      }

      sendUpdate('long_form_videos', links);
    }
  } catch (error) {
    console.error('YouTube fetch error:', error);
  }
}

async function fetchYouTubeShorts(contextualTopic: any, sendUpdate: Function) {
  // Create a contextual search query by combining original query with key context
  const hubContext = contextualTopic.contextParts.find((p: any) => p.startsWith('Hub:'))?.replace('Hub:', '').trim();
  const topicContext = contextualTopic.contextParts.find((p: any) => p.startsWith('Topic:'))?.replace('Topic:', '').trim();
  
  let searchQuery = contextualTopic.originalQuery;
  if (topicContext) {
    searchQuery += ` ${topicContext}`;
  }
  if (hubContext && hubContext !== topicContext) {
    searchQuery += ` ${hubContext}`;
  }
  
  const topic = searchQuery;
  if (!process.env.YOUTUBE_API_KEY) return;

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: `${topic} #shorts`,
        type: 'video',
        videoDuration: 'short',
        maxResults: 15,
        key: process.env.YOUTUBE_API_KEY,
        order: 'relevance'
      }
    });

    const videos: any[] = response.data.items || [];
    
    if (videos.length > 0) {
      const videoIds = videos.map(v => v.id.videoId).join(',');
      const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'contentDetails,snippet',
          id: videoIds,
          key: process.env.YOUTUBE_API_KEY
        }
      });

      const videoDetails = detailsResponse.data.items || [];
      const shortLinks: Link[] = [];
      
      for (const videoDetail of videoDetails) {
        const duration = videoDetail.contentDetails.duration;
        const durationMatch = duration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
        const minutes = parseInt(durationMatch?.[1] || '0');
        const seconds = parseInt(durationMatch?.[2] || '0');
        const totalSeconds = minutes * 60 + seconds;
        
        const isLikelyShort = totalSeconds <= 60 || 
                             videoDetail.snippet.title.toLowerCase().includes('shorts') ||
                             videoDetail.snippet.description.toLowerCase().includes('#shorts');
        
        if (isLikelyShort && shortLinks.length < 5) {
          shortLinks.push({
            title: decodeHtmlEntities(videoDetail.snippet.title),
            url: `https://www.youtube.com/shorts/${videoDetail.id}`,
            snippet: decodeHtmlEntities(videoDetail.snippet.description.substring(0, 200)) + '...',
            source: 'YouTube',
            category: 'short_form_videos',
            topic: topic,
            thumbnail: `https://img.youtube.com/vi/${videoDetail.id}/maxresdefault.jpg`
          });
        }
      }

      if (shortLinks.length > 0) {
        // Store in database
        for (const link of shortLinks) {
          try {
            const embeddingText = `${link.title} ${link.snippet}`;
            const embedding = await generateEmbedding(embeddingText);
            await insertLink({ ...link, topic, embedding });
          } catch (error) {
            console.error('Error storing link:', error);
          }
        }

        sendUpdate('short_form_videos', shortLinks);
      }
    }
  } catch (error) {
    console.error('YouTube Shorts fetch error:', error);
  }
}

// Removed fetchGoogleArticles - replaced with NewsAPI

async function createFallbackArticles(topic: string): Promise<Link[]> {
  // Use DuckDuckGo search to find real articles
  try {
    const searchQuery = `${topic} site:*.edu OR site:*.gov OR site:pubmed.ncbi.nlm.nih.gov OR site:who.int`;
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_html=1&skip_disambig=1`;
    
    const response = await axios.get(searchUrl, { timeout: 10000 });
    const results = response.data?.RelatedTopics || [];
    
    const articles: Link[] = [];
    
    for (let i = 0; i < Math.min(results.length, 5); i++) {
      const result = results[i];
      if (result.FirstURL && result.Text) {
        articles.push({
          title: result.Text.split(' - ')[0] || `Research on ${topic}`,
          url: result.FirstURL,
          snippet: result.Text.substring(0, 200),
          source: new URL(result.FirstURL).hostname.replace('www.', ''),
          category: 'articles',
          topic: topic,
          thumbnail: `https://via.placeholder.com/400x200/6366F1/FFFFFF?text=${encodeURIComponent('Research Article')}`
        });
      }
    }
    
    if (articles.length > 0) {
      return articles;
    }
  } catch (error) {
    console.error('DuckDuckGo search failed:', error);
  }
  
  // Fallback to curated examples if search fails
  const topicWords = topic.toLowerCase().split(' ');
  const examples: Link[] = [];
  
  // Create topic-specific examples
  if (topicWords.includes('nutrition') || topicWords.includes('diet')) {
    examples.push({
      title: `Nutrition Science: Evidence-Based Approaches to ${topic}`,
      url: `https://www.hsph.harvard.edu/nutritionsource/${topic.replace(/\s+/g, '-').toLowerCase()}`,
      snippet: `Harvard T.H. Chan School of Public Health provides evidence-based guidance on ${topic}, reviewing the latest research and recommendations.`,
      source: 'Harvard School of Public Health',
      category: 'articles',
      topic: topic,
      thumbnail: `https://via.placeholder.com/400x200/DC2626/FFFFFF?text=${encodeURIComponent('Harvard Nutrition')}`
    });
  }
  
  if (topicWords.includes('exercise') || topicWords.includes('training') || topicWords.includes('fitness')) {
    examples.push({
      title: `Exercise Science: Research on ${topic}`,
      url: `https://www.acsm.org/research-practice/${topic.replace(/\s+/g, '-').toLowerCase()}`,
      snippet: `The American College of Sports Medicine provides research-based insights on ${topic} and exercise science.`,
      source: 'American College of Sports Medicine',
      category: 'articles',
      topic: topic,
      thumbnail: `https://via.placeholder.com/400x200/16A34A/FFFFFF?text=${encodeURIComponent('Exercise Science')}`
    });
  }
  
  // Add more diverse, real sources
  if (topicWords.includes('running') || topicWords.includes('marathon') || topicWords.includes('endurance')) {
    examples.push({
      title: `Runner's World: Expert Guide to ${topic}`,
      url: `https://www.runnersworld.com/search?q=${encodeURIComponent(topic)}`,
      snippet: `Runner's World provides expert advice, training tips, and the latest research on ${topic} for runners of all levels.`,
      source: 'Runner\'s World',
      category: 'articles',
      topic: topic,
      thumbnail: `https://via.placeholder.com/400x200/FF6B35/FFFFFF?text=${encodeURIComponent('Runners World')}`
    });
  }
  
  if (topicWords.includes('health') || topicWords.includes('medical') || topicWords.includes('wellness')) {
    examples.push({
      title: `Mayo Clinic: Medical Insights on ${topic}`,
      url: `https://www.mayoclinic.org/search/search-results?q=${encodeURIComponent(topic)}`,
      snippet: `Mayo Clinic provides trusted medical information and expert insights on ${topic} from leading healthcare professionals.`,
      source: 'Mayo Clinic',
      category: 'articles',
      topic: topic,
      thumbnail: `https://via.placeholder.com/400x200/0078D4/FFFFFF?text=${encodeURIComponent('Mayo Clinic')}`
    });
  }
  
  return examples.slice(0, 3);
}

async function fetchPodcasts(contextualTopic: any, sendUpdate: Function) {
  // Create a contextual search query by combining original query with key context
  const hubContext = contextualTopic.contextParts.find((p: any) => p.startsWith('Hub:'))?.replace('Hub:', '').trim();
  const topicContext = contextualTopic.contextParts.find((p: any) => p.startsWith('Topic:'))?.replace('Topic:', '').trim();
  
  let searchQuery = contextualTopic.originalQuery;
  if (topicContext) {
    searchQuery += ` ${topicContext}`;
  }
  if (hubContext && hubContext !== topicContext) {
    searchQuery += ` ${hubContext}`;
  }
  
  const topic = searchQuery;
  try {
    // Use iTunes/Apple Podcasts API to search for podcasts
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(topic)}&media=podcast&limit=10`;
    
    const response = await axios.get(searchUrl, { timeout: 10000 });
    const results = response.data?.results || [];
    
    const podcasts: Link[] = results.map((podcast: any) => ({
      title: podcast.trackName || podcast.collectionName || 'Podcast',
      url: podcast.trackViewUrl || podcast.collectionViewUrl,
      snippet: podcast.description || `${podcast.artistName} discusses ${topic} in this podcast.`,
      source: 'Apple Podcasts',
      category: 'podcasts',
      thumbnail: podcast.artworkUrl600 || podcast.artworkUrl100,
      creator: podcast.artistName,
      published_at: null,
      duration_sec: null
    }));

    if (podcasts.length > 0) {
      // Store in database
      for (const link of podcasts) {
        try {
          const embeddingText = `${link.title} ${link.snippet}`;
          const embedding = await generateEmbedding(embeddingText);
          await insertLink({ ...link, topic, embedding });
        } catch (error) {
          console.error('Error storing podcast:', error);
        }
      }

      sendUpdate('podcasts', podcasts.slice(0, 6));
    }
  } catch (error) {
    console.error('Podcast search error:', error);
    
    // Fallback podcast examples
    const fallbackPodcasts = [
      {
        title: `The ${topic} Podcast`,
        url: `https://podcasts.apple.com/search?term=${encodeURIComponent(topic)}`,
        snippet: `Explore podcasts about ${topic} on Apple Podcasts. Find expert discussions, interviews, and insights.`,
        source: 'Apple Podcasts',
        category: 'podcasts',
        thumbnail: `https://via.placeholder.com/400x400/6366F1/FFFFFF?text=${encodeURIComponent('Podcast')}`,
        creator: 'Various',
        published_at: null,
        duration_sec: null
      }
    ];
    
    sendUpdate('podcasts', fallbackPodcasts);
  }
}

async function fetchGoogleImages(contextualTopic: any, sendUpdate: Function) {
  // Create a contextual search query by combining original query with key context
  const hubContext = contextualTopic.contextParts.find((p: any) => p.startsWith('Hub:'))?.replace('Hub:', '').trim();
  const topicContext = contextualTopic.contextParts.find((p: any) => p.startsWith('Topic:'))?.replace('Topic:', '').trim();
  
  let searchQuery = contextualTopic.originalQuery;
  if (topicContext) {
    searchQuery += ` ${topicContext}`;
  }
  if (hubContext && hubContext !== topicContext) {
    searchQuery += ` ${hubContext}`;
  }
  
  const topic = searchQuery;
  console.log('Unsplash: Starting search for topic:', topic);
  console.log('Unsplash API key available:', !!process.env.UNSPLASH_ACCESS_KEY);
  
  try {
    // First, get better search keywords from OpenAI
    let searchKeywords = topic;
    if (process.env.OPENAI_API_KEY) {
      try {
        const keywordResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: `Context: ${contextualTopic.enrichedQuery}

Given this context and the search term "${contextualTopic.originalQuery}", provide the 3 best keywords for searching high-quality images on Unsplash. 

Focus on visual, concrete terms that would find relevant photos within this specific context. For example:
- If searching "mask" in a sleep/health context, use keywords like "sleep mask eye mask rest"
- If searching "shoes" in a fitness/running context, use keywords like "running shoes athletic footwear"

Respond with just the keywords separated by spaces, nothing else.`
          }],
          max_tokens: 50,
          temperature: 0.3
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        
        searchKeywords = keywordResponse.data.choices[0]?.message?.content?.trim() || topic;
        console.log('Unsplash: Using AI-generated keywords:', searchKeywords);
      } catch (keywordError) {
        console.log('Unsplash: Failed to get AI keywords, using original topic:', (keywordError as any)?.message || 'Unknown error');
      }
    }
    
    // Use Unsplash API as a high-quality image source
    if (process.env.UNSPLASH_ACCESS_KEY) {
      const response = await axios.get(`https://api.unsplash.com/search/photos`, {
        params: {
          query: searchKeywords,
          per_page: 5,
          orientation: 'landscape',
          order_by: 'relevant'
        },
        headers: {
          'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
        },
        timeout: 10000
      });
      
      console.log('Unsplash API response status:', response.status);
      console.log('Unsplash results count:', response.data?.results?.length || 0);
      
      const results = response.data?.results || [];
      const images: Link[] = results.map((img: any) => ({
        title: img.alt_description || img.description || `${topic} image`,
        url: img.urls.regular,
        snippet: `${img.alt_description || img.description || `High-quality image related to ${topic}`}. Photo by ${img.user.name} on Unsplash.`,
        source: 'Unsplash',
        category: 'images',
        thumbnail: img.urls.small,
        creator: img.user.name,
        published_at: null,
        duration_sec: null
      }));

      if (images.length > 0) {
        console.log('Unsplash: Sending', images.length, 'images');
        sendUpdate('images', images);
        return;
      } else {
        console.log('Unsplash: No images found, falling back');
      }
    } else {
      console.log('Unsplash: No API key found, falling back');
    }
  } catch (error) {
    console.error('Unsplash search error:', (error as any)?.response?.data || (error as any)?.message || 'Unknown error');
  }
  
  // Fallback: Create placeholder images
  const fallbackImages = [
    {
      title: `${topic} Visual Guide`,
      url: `https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80`,
      snippet: `Visual representation and infographics related to ${topic}.`,
      source: 'Stock Images',
      category: 'images',
      thumbnail: `https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80`,
      creator: 'Stock Photo',
      published_at: null,
      duration_sec: null
    },
    {
      title: `${topic} Reference Chart`,
      url: `https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80`,
      snippet: `Reference charts and diagrams for ${topic} concepts and techniques.`,
      source: 'Stock Images',
      category: 'images',
      thumbnail: `https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80`,
      creator: 'Stock Photo',
      published_at: null,
      duration_sec: null
    }
  ];
  
  sendUpdate('images', fallbackImages);
}

async function fetchNewsAPI(contextualTopic: any, sendUpdate: Function) {
  // Create a contextual search query by combining original query with key context
  const hubContext = contextualTopic.contextParts.find((p: any) => p.startsWith('Hub:'))?.replace('Hub:', '').trim();
  const topicContext = contextualTopic.contextParts.find((p: any) => p.startsWith('Topic:'))?.replace('Topic:', '').trim();
  
  let searchQuery = contextualTopic.originalQuery;
  if (topicContext) {
    searchQuery += ` ${topicContext}`;
  }
  if (hubContext && hubContext !== topicContext) {
    searchQuery += ` ${hubContext}`;
  }
  
  const topic = searchQuery;
  const API_KEY = '0690f59958ce4712b05a3dd2c7d54a22';
  
  console.log(`NewsAPI: Starting search for topic "${topic}"`);
  
  try {
    // Search for everything (news articles)
    console.log('NewsAPI: Making API call to everything endpoint');
    const searchResponse = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: topic,
        apiKey: API_KEY,
        language: 'en',
        sortBy: 'relevancy',
        pageSize: 15,
        from: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Last 20 days (conservative for NewsAPI free plan)
      },
      timeout: 10000
    });

    const articles = searchResponse.data?.articles || [];
    
    console.log(`NewsAPI: Received ${articles.length} articles from everything endpoint`);
    console.log('NewsAPI: Response status:', searchResponse.status);
    console.log('NewsAPI: Total results:', searchResponse.data?.totalResults);
    
    if (articles.length > 0) {
      const newsLinks: Link[] = articles
        .filter((article: any) => 
          article.title && 
          article.url && 
          article.title !== '[Removed]' &&
          !article.url.includes('removed.com')
        )
        .slice(0, 10)
        .map((article: any) => ({
          title: article.title,
          url: article.url,
          snippet: article.description || article.content?.substring(0, 200) || `News article about ${topic}`,
          source: article.source?.name || new URL(article.url).hostname.replace('www.', ''),
          category: 'articles',
          thumbnail: article.urlToImage || undefined,
          creator: article.author,
          published_at: article.publishedAt ? article.publishedAt.split('T')[0] : null,
          duration_sec: null
        }));

      if (newsLinks.length > 0) {
        // Store in database
        for (const link of newsLinks) {
          try {
            if (!link.thumbnail) {
              link.thumbnail = await fetchOGImage(link.url);
            }
            const embeddingText = `${link.title} ${link.snippet}`;
            const embedding = await generateEmbedding(embeddingText);
            await insertLink({ ...link, topic, embedding });
          } catch (error) {
            console.error('Error storing news article:', error);
          }
        }

        console.log(`NewsAPI: Sending ${newsLinks.length} valid articles`);
        sendUpdate('articles', newsLinks);
      } else {
        console.log('NewsAPI: No valid articles to send');
      }
    } else {
      console.log('NewsAPI: No articles in response');
    }
  } catch (error: any) {
    console.error('NewsAPI error:', error.message);
    console.error('NewsAPI error details:', error.response?.data);
    
    // Try top headlines as fallback
    try {
      const headlinesResponse = await axios.get('https://newsapi.org/v2/top-headlines', {
        params: {
          q: topic,
          apiKey: API_KEY,
          language: 'en',
          pageSize: 5
        },
        timeout: 10000
      });

      const headlines = headlinesResponse.data?.articles || [];
      
      if (headlines.length > 0) {
        const headlineLinks: Link[] = headlines
          .filter((article: any) => 
            article.title && 
            article.url && 
            article.title !== '[Removed]'
          )
          .map((article: any) => ({
            title: article.title,
            url: article.url,
            snippet: article.description || `Breaking news about ${topic}`,
            source: article.source?.name || 'News',
            category: 'articles',
            thumbnail: article.urlToImage,
            creator: article.author,
            published_at: article.publishedAt ? article.publishedAt.split('T')[0] : null,
            duration_sec: null
          }));

        if (headlineLinks.length > 0) {
          sendUpdate('articles', headlineLinks);
        }
      }
    } catch (headlineError) {
      console.error('NewsAPI headlines fallback error:', (headlineError as any)?.message || headlineError);
    }
  }
}