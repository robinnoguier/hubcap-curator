import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import axios from 'axios';
import { insertLink } from '@/lib/db';
import { generateEmbedding, extractLinksFromText, decodeHtmlEntities, fetchOGImage } from '@/lib/utils';
import { AI_PROMPTS } from '@/lib/prompts';
import { SearchRequest, SearchResponse, Link, YouTubeVideo } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { topic }: SearchRequest = await request.json();
    
    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const results: SearchResponse = {
      long_form_videos: [],
      short_form_videos: [],
      articles: [],
      podcasts: [],
      images: []
    };

    await Promise.all([
      fetchOpenAILinks(topic, results),
      fetchPerplexityLinks(topic, results),
      fetchYouTubeVideos(topic, results),
      fetchYouTubeShorts(topic, results)
    ]);

    // Generate embeddings and add thumbnails for articles, then store links
    for (const category of Object.keys(results) as Array<keyof SearchResponse>) {
      for (const link of results[category]) {
        try {
          // Add thumbnail for articles if not already present
          if (category === 'articles' && !link.thumbnail) {
            link.thumbnail = await fetchOGImage(link.url);
          }
          
          const embeddingText = `${link.title} ${link.snippet}`;
          const embedding = await generateEmbedding(embeddingText);
          
          await insertLink({
            ...link,
            category,
            topic,
            embedding
          });
        } catch (error) {
          console.error('Error storing link:', error);
        }
      }
    }

    // Debug: Log final results
    console.log('Final results summary:');
    console.log(`Long-form videos: ${results.long_form_videos.length}`);
    console.log(`Short-form videos: ${results.short_form_videos.length}`);
    console.log(`Articles: ${results.articles.length}`);
    
    // Log source breakdown
    const sourceBreakdown = {
      long_form_videos: {},
      short_form_videos: {},
      articles: {}
    };
    
    for (const [category, links] of Object.entries(results)) {
      (sourceBreakdown as any)[category] = {};
      for (const link of links) {
        (sourceBreakdown as any)[category][link.source] = ((sourceBreakdown as any)[category][link.source] || 0) + 1;
      }
    }
    
    console.log('Source breakdown:', JSON.stringify(sourceBreakdown, null, 2));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function fetchOpenAILinks(topic: string, results: SearchResponse) {
  try {
    const prompts = {
      long_form_videos: AI_PROMPTS.OPENAI.LONG_FORM_VIDEOS(topic),
      short_form_videos: AI_PROMPTS.OPENAI.SHORT_FORM_VIDEOS(topic),
      articles: AI_PROMPTS.OPENAI.ARTICLES(topic)
    };

    const promises = Object.entries(prompts).map(async ([category, prompt]) => {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: AI_PROMPTS.OPENAI.SYSTEM
            },
            { 
              role: 'user', 
              content: prompt 
            }
          ],
          temperature: 0.3
        });

        const content = response.choices[0]?.message?.content || '';
        console.log(`OpenAI ${category} response:`, content.substring(0, 500));
        const links = extractLinksFromText(content, 'OpenAI');
        console.log(`OpenAI ${category} extracted links:`, links.length);
        
        // Validate that we have actual URLs
        const validLinks = links.filter(link => 
          link.url && 
          link.url.startsWith('http') && 
          link.url.includes('.') &&
          !link.url.includes('example.com') &&
          !link.url.includes('placeholder')
        );
        
        const maxLinks = category === 'articles' ? 5 : 3; // 5 articles, 3 videos
        results[category as keyof SearchResponse].push(
          ...validLinks.slice(0, maxLinks).map(link => ({
            ...link,
            title: link.title || 'Untitled',
            url: link.url || '',
            snippet: link.snippet || '',
            source: 'OpenAI'
          })) as Link[]
        );
      } catch (error) {
        console.error(`OpenAI ${category} error:`, error);
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('OpenAI fetch error:', error);
  }
}

async function fetchPerplexityLinks(topic: string, results: SearchResponse) {
  if (!process.env.PPLX_API_KEY) {
    console.log('No Perplexity API key found');
    return;
  }

  console.log('Starting Perplexity API calls for topic:', topic);

  try {
    const prompts = {
      long_form_videos: AI_PROMPTS.PERPLEXITY.BASE(AI_PROMPTS.PERPLEXITY.LONG_FORM_VIDEOS(topic)),
      short_form_videos: AI_PROMPTS.PERPLEXITY.BASE(AI_PROMPTS.PERPLEXITY.SHORT_FORM_VIDEOS(topic)),
      articles: AI_PROMPTS.PERPLEXITY.BASE(AI_PROMPTS.PERPLEXITY.ARTICLES(topic))
    };

    const promises = Object.entries(prompts).map(async ([category, prompt]) => {
      try {
        console.log(`Making Perplexity API call for ${category}...`);
        
        const requestBody = {
          model: 'sonar',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1200
        };

        const response = await axios.post(
          'https://api.perplexity.ai/chat/completions',
          requestBody,
          {
            headers: {
              'Authorization': `Bearer ${process.env.PPLX_API_KEY}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 30000
          }
        );

        console.log(`Perplexity ${category} response status:`, response.status);
        
        const content = response.data.choices[0]?.message?.content || '';
        console.log(`Perplexity ${category} content length:`, content.length);
        console.log(`Perplexity ${category} content:`, content.substring(0, 500) + '...');
        
        const links = extractLinksFromText(content, 'Perplexity');
        console.log(`Perplexity ${category} extracted links:`, links.length);
        
        const maxLinks = category === 'articles' ? 5 : 3;
        const validLinks = links.slice(0, maxLinks).map(link => ({
          ...link,
          title: link.title || 'Untitled',
          url: link.url || '',
          snippet: link.snippet || '',
          source: 'Perplexity'
        })) as Link[];

        results[category as keyof SearchResponse].push(...validLinks);
        console.log(`Added ${validLinks.length} Perplexity links to ${category}`);
      } catch (error: any) {
        console.error(`Perplexity ${category} error:`, {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        });
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Perplexity fetch error:', error);
  }
}

async function fetchYouTubeVideos(topic: string, results: SearchResponse) {
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
    
    for (const video of videos) {
      const link: Link = {
        title: decodeHtmlEntities(video.snippet.title),
        url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
        snippet: decodeHtmlEntities(video.snippet.description.substring(0, 200)) + '...',
        source: 'YouTube',
        category: 'long_form_videos',
        topic: topic,
        thumbnail: `https://img.youtube.com/vi/${video.id.videoId}/maxresdefault.jpg`
      };
      
      results.long_form_videos.push(link);
    }
  } catch (error) {
    console.error('YouTube fetch error:', error);
  }
}

async function fetchYouTubeShorts(topic: string, results: SearchResponse) {
  if (!process.env.YOUTUBE_API_KEY) return;

  try {
    // Search specifically for YouTube Shorts using #shorts hashtag and short duration
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: `${topic} #shorts`,
        type: 'video',
        videoDuration: 'short', // Under 4 minutes (closest to Shorts duration)
        maxResults: 15, // Get more to filter for actual Shorts
        key: process.env.YOUTUBE_API_KEY,
        order: 'relevance'
      }
    });

    const videos: any[] = response.data.items || [];
    
    // Get video details to check duration and other Shorts indicators
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
      
      for (const videoDetail of videoDetails) {
        const duration = videoDetail.contentDetails.duration;
        
        // Parse ISO 8601 duration to seconds (PT1M30S = 90 seconds)
        const durationMatch = duration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
        const minutes = parseInt(durationMatch?.[1] || '0');
        const seconds = parseInt(durationMatch?.[2] || '0');
        const totalSeconds = minutes * 60 + seconds;
        
        // YouTube Shorts are typically under 60 seconds
        const isLikelyShort = totalSeconds <= 60 || 
                             videoDetail.snippet.title.toLowerCase().includes('shorts') ||
                             videoDetail.snippet.description.toLowerCase().includes('#shorts');
        
        if (isLikelyShort) {
          const link: Link = {
            title: decodeHtmlEntities(videoDetail.snippet.title),
            url: `https://www.youtube.com/shorts/${videoDetail.id}`, // Use Shorts URL format
            snippet: decodeHtmlEntities(videoDetail.snippet.description.substring(0, 200)) + '...',
            source: 'YouTube',
            category: 'short_form_videos',
            topic: topic,
            thumbnail: `https://img.youtube.com/vi/${videoDetail.id}/maxresdefault.jpg`
          };
          
          results.short_form_videos.push(link);
          
          // Limit to about 5 shorts from YouTube API
          if (results.short_form_videos.filter(l => l.source === 'YouTube').length >= 5) {
            break;
          }
        }
      }
    }
  } catch (error) {
    console.error('YouTube Shorts fetch error:', error);
  }
}