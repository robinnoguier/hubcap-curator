import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import axios from 'axios';
import { insertLink, getLikedLinks, getDislikedLinks } from '@/lib/db';
import { generateEmbedding, extractLinksFromText, rankLinksBySimilarity, decodeHtmlEntities, fetchOGImage } from '@/lib/utils';
import { AI_PROMPTS, buildContextFromFeedback } from '@/lib/prompts';
import { MoreLinksRequest, SearchResponse, Link } from '@/lib/types';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export async function POST(request: NextRequest) {
  try {
    const { topic }: MoreLinksRequest = await request.json();
    
    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    // Get user feedback for re-ranking
    const likedLinks = getLikedLinks(topic);
    const dislikedLinks = getDislikedLinks(topic);
    
    const likedEmbeddings = likedLinks
      .filter(link => link.embedding)
      .map(link => link.embedding!);
      
    const dislikedEmbeddings = dislikedLinks
      .filter(link => link.embedding)
      .map(link => link.embedding!);

    const results: SearchResponse = {
      long_form_videos: [],
      short_form_videos: [],
      articles: [],
      podcasts: [],
      images: []
    };

    // Fetch new links
    await Promise.all([
      fetchMoreOpenAILinks(topic, results, likedLinks, dislikedLinks),
      fetchMorePerplexityLinks(topic, results, likedLinks, dislikedLinks),
      fetchMoreYouTubeVideos(topic, results)
    ]);

    // Generate embeddings and store new links
    for (const category of Object.keys(results) as Array<keyof SearchResponse>) {
      const linksWithEmbeddings: Link[] = [];
      
      for (const link of results[category]) {
        try {
          // Add thumbnail for articles if not already present
          if (category === 'articles' && !link.thumbnail) {
            link.thumbnail = await fetchOGImage(link.url);
          }
          
          const embeddingText = `${link.title} ${link.snippet}`;
          const embedding = await generateEmbedding(embeddingText);
          
          const linkWithEmbedding = {
            ...link,
            embedding
          };
          
          linksWithEmbeddings.push(linkWithEmbedding);
          
          await insertLink({
            ...link,
            category,
            topic,
            embedding
          });
        } catch (error) {
          console.error('Error storing link:', error);
          linksWithEmbeddings.push(link);
        }
      }
      
      // Re-rank based on user feedback
      if (likedEmbeddings.length > 0 || dislikedEmbeddings.length > 0) {
        results[category] = rankLinksBySimilarity(
          linksWithEmbeddings,
          likedEmbeddings,
          dislikedEmbeddings
        );
      } else {
        results[category] = linksWithEmbeddings;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('More links error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function fetchMoreOpenAILinks(topic: string, results: SearchResponse, likedLinks: Link[], dislikedLinks: Link[]) {
  if (!openai) return;
  
  try {
    const context = buildContextFromFeedback(likedLinks, dislikedLinks);
    
    const prompts = {
      long_form_videos: AI_PROMPTS.OPENAI.LONG_FORM_VIDEOS(topic, context),
      short_form_videos: AI_PROMPTS.OPENAI.SHORT_FORM_VIDEOS(topic, context),
      articles: AI_PROMPTS.OPENAI.ARTICLES(topic, context)
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
        const links = extractLinksFromText(content, 'OpenAI');
        
        // Validate that we have actual URLs
        const validLinks = links.filter(link => 
          link.url && 
          link.url.startsWith('http') && 
          link.url.includes('.') &&
          !link.url.includes('example.com') &&
          !link.url.includes('placeholder')
        );
        
        results[category as keyof SearchResponse].push(
          ...validLinks.slice(0, 3).map(link => ({
            ...link,
            title: link.title || 'Untitled',
            url: link.url || '',
            snippet: link.snippet || '',
            source: 'OpenAI'
          })) as Link[]
        );
      } catch (error) {
        console.error(`OpenAI more ${category} error:`, error);
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('OpenAI more links error:', error);
  }
}

async function fetchMorePerplexityLinks(topic: string, results: SearchResponse, likedLinks: Link[], dislikedLinks: Link[]) {
  if (!process.env.PPLX_API_KEY) return;

  try {
    const context = buildContextFromFeedback(likedLinks, dislikedLinks);
    
    const prompts = {
      long_form_videos: AI_PROMPTS.PERPLEXITY.LONG_FORM_VIDEOS(topic, context),
      short_form_videos: AI_PROMPTS.PERPLEXITY.SHORT_FORM_VIDEOS(topic, context),
      articles: AI_PROMPTS.PERPLEXITY.ARTICLES(topic, context)
    };

    const promises = Object.entries(prompts).map(async ([category, prompt]) => {
      try {
        const response = await axios.post(
          'https://api.perplexity.ai/chat/completions',
          {
            model: 'sonar',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 800
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.PPLX_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const content = response.data.choices[0]?.message?.content || '';
        const links = extractLinksFromText(content, 'Perplexity');
        
        results[category as keyof SearchResponse].push(
          ...links.slice(0, 10).map(link => ({
            ...link,
            title: link.title || 'Untitled',
            url: link.url || '',
            snippet: link.snippet || '',
            source: 'Perplexity'
          })) as Link[]
        );
      } catch (error) {
        console.error(`Perplexity more ${category} error:`, error);
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Perplexity more links error:', error);
  }
}

async function fetchMoreYouTubeVideos(topic: string, results: SearchResponse) {
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
        order: 'date', // Get newer content
        publishedAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
      }
    });

    const videos = response.data.items || [];
    
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
    console.error('YouTube more videos error:', error);
  }
}

