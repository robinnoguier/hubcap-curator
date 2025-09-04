import OpenAI from 'openai';
import { Link } from './types';

const getOpenAIClient = () => {
  if (typeof window !== 'undefined') {
    throw new Error('OpenAI client should only be used on the server-side');
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

export const generateEmbedding = async (text: string): Promise<Float32Array> => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // Return a dummy embedding during build time
      return new Float32Array(1536).fill(0);
    }
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return new Float32Array(response.data[0].embedding);
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
};

export const cosineSimilarity = (a: Float32Array, b: Float32Array): number => {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  
  return dotProduct / denominator;
};

export const calculateAverageEmbedding = (embeddings: Float32Array[]): Float32Array => {
  if (embeddings.length === 0) {
    throw new Error('Cannot calculate average of empty array');
  }
  
  const dimension = embeddings[0].length;
  const average = new Float32Array(dimension);
  
  for (const embedding of embeddings) {
    for (let i = 0; i < dimension; i++) {
      average[i] += embedding[i];
    }
  }
  
  for (let i = 0; i < dimension; i++) {
    average[i] /= embeddings.length;
  }
  
  return average;
};

export const rankLinksBySimilarity = (
  links: Link[],
  likedEmbeddings: Float32Array[],
  dislikedEmbeddings: Float32Array[]
): Link[] => {
  if (likedEmbeddings.length === 0 && dislikedEmbeddings.length === 0) {
    return links;
  }
  
  const rankedLinks = links.map(link => {
    if (!link.embedding) return { ...link, score: 0 };
    
    let score = 0;
    
    if (likedEmbeddings.length > 0) {
      const avgLikedEmbedding = calculateAverageEmbedding(likedEmbeddings);
      const likedSimilarity = cosineSimilarity(link.embedding, avgLikedEmbedding);
      score += likedSimilarity * 2; // Weight liked content higher
    }
    
    if (dislikedEmbeddings.length > 0) {
      const avgDislikedEmbedding = calculateAverageEmbedding(dislikedEmbeddings);
      const dislikedSimilarity = cosineSimilarity(link.embedding, avgDislikedEmbedding);
      score -= dislikedSimilarity; // Subtract similarity to disliked content
    }
    
    return { ...link, score };
  });
  
  return rankedLinks
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map(({ score, ...link }) => link);
};

export const extractLinksFromText = (text: string, source: string): Partial<Link>[] => {
  const links: Partial<Link>[] = [];
  
  // First try to parse as JSON (new format)
  let jsonText = text.trim();
  
  // Handle markdown code blocks (```json ... ```)
  if (jsonText.startsWith('```json') || jsonText.startsWith('```')) {
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1];
    }
  }
  
  try {
    const jsonData = JSON.parse(jsonText);
    if (jsonData.links && Array.isArray(jsonData.links)) {
      console.log(`Found ${jsonData.links.length} links in JSON from ${source}`);
      return jsonData.links.map((link: any) => ({
        title: link.title || 'Untitled',
        url: link.url || '',
        snippet: link.description || link.snippet || '',
        source: link.source || source,
        thumbnail: getYouTubeThumbnail(link.url) || undefined,
        creator: link.creator || null,
        published_at: link.published_at || null,
        duration_sec: link.duration_sec || null,
        section: link.section || null
      }));
    }
  } catch (e) {
    console.log(`Failed to parse JSON from ${source}:`, e);
    // Not JSON, continue with text parsing
  }
  
  // Handle Perplexity format: **Title**  \n URL: https://...  \n Description
  if (source === 'Perplexity') {
    // Look for numbered entries with title, URL, and description
    const perplexityPattern = /(\d+)\.\s*\*\*(.+?)\*\*[^\n]*\n.*?URL:\s*(https?:\/\/[^\s\n]+)[^\n]*\n.*?Description:\s*([^\n]+)/gm;
    let match;
    
    while ((match = perplexityPattern.exec(text)) !== null) {
      const [, , title, url, description] = match;
      
      if (url && !url.includes('example.com') && !url.includes('placeholder') && url.length > 10) {
        links.push({
          title: title.trim(),
          url: url.trim(),
          snippet: description.trim(),
          source,
          thumbnail: getYouTubeThumbnail(url.trim())
        });
      }
    }
    
    // Alternative format: Title - URL - Description
    if (links.length === 0) {
      const altPattern = /\d+\.\s*([^-\n]+)\s*-?\s*URL:\s*(https?:\/\/[^\s\n]+)\s*-?\s*([^\n]*)/gm;
      let altMatch;
      
      while ((altMatch = altPattern.exec(text)) !== null) {
        const [, title, url, description] = altMatch;
        
        if (url && !url.includes('example.com') && !url.includes('placeholder') && url.length > 10) {
          links.push({
            title: title.trim(),
            url: url.trim(), 
            snippet: description.trim() || title.trim(),
            source,
            thumbnail: getYouTubeThumbnail(url.trim())
          });
        }
      }
    }
    
    // Fallback: Simple title - URL - description format
    if (links.length === 0) {
      const simplePattern = /\d+\.\s*([^-]+?)\s*-\s*(https?:\/\/[^\s]+)\s*-\s*(.+?)(?=\n\d+\.|$)/gm;
      let simpleMatch;
      
      while ((simpleMatch = simplePattern.exec(text)) !== null) {
        const [, title, url, description] = simpleMatch;
        
        if (url && !url.includes('example.com') && !url.includes('placeholder') && url.length > 10) {
          links.push({
            title: title.trim(),
            url: url.trim(),
            snippet: description.trim(),
            source,
            thumbnail: getYouTubeThumbnail(url.trim())
          });
        }
      }
    }
  } else {
    // Original parsing for OpenAI and other sources
    // Try to parse structured format first (Title - URL - Description)
    const structuredMatches = text.match(/\d+\.\s*(.+?)\s*-\s*(https?:\/\/[^\s]+)\s*-\s*(.+?)(?=\d+\.|$)/gm);
    if (structuredMatches) {
      for (const match of structuredMatches) {
        const parts = match.split(' - ');
        if (parts.length >= 2) {
          const title = parts[0].replace(/^\d+\.\s*/, '').trim();
          const url = parts[1].trim();
          const description = parts.slice(2).join(' - ').trim();
          
          // Skip obviously invalid URLs
          if (url.includes('example.com') || url.includes('placeholder') || url.length < 10) {
            continue;
          }
          
          links.push({
            title: title || 'Untitled',
            url: url,
            snippet: description || title,
            source,
            thumbnail: getYouTubeThumbnail(url)
          });
        }
      }
    }
    
    // If structured format didn't work, try line-by-line parsing
    if (links.length === 0) {
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        // Skip lines that are obviously not links
        if (line.includes('**URL:**') || line.trim().startsWith('**URL:**') || line.trim().startsWith('URL:')) {
          continue;
        }
        
        // Look for URLs in the line
        const urlMatches = line.match(/(https?:\/\/[^\s\)]+)/g);
        if (urlMatches) {
          for (const url of urlMatches) {
            // Clean up the URL
            const cleanUrl = url.replace(/[,\.\!\?\)\]]+$/, '');
            
            // Skip invalid URLs
            if (cleanUrl.includes('example.com') || 
                cleanUrl.includes('placeholder') ||
                cleanUrl.length < 10) {
              continue;
            }
            
            // Extract title (everything before the URL)
            let title = line.replace(url, '').replace(/^\d+\.\s*/, '').replace(/^[-\*]\s*/, '').trim();
            
            // Clean up title
            title = title.replace(/^["']|["']$/g, '').replace(/\s*-\s*$/, '');
            
            if (!title) {
              // Try to extract domain as title
              try {
                const domain = new URL(cleanUrl).hostname.replace('www.', '');
                title = domain.charAt(0).toUpperCase() + domain.slice(1);
              } catch {
                title = 'Untitled';
              }
            }
            
            const snippet = line.length > 150 ? line.substring(0, 147) + '...' : line;
            const thumbnail = getYouTubeThumbnail(cleanUrl);
            
            links.push({
              title,
              url: cleanUrl,
              snippet,
              source,
              thumbnail
            });
          }
        }
        
        // Handle YouTube URLs without http/https
        const partialYouTubeMatch = line.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (partialYouTubeMatch && !urlMatches) {
          const videoId = partialYouTubeMatch[1];
          const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;
          let title = line.replace(partialYouTubeMatch[0], '').replace(/^\d+\.\s*/, '').replace(/^[-\*]\s*/, '').trim();
          title = title.replace(/^["']|["']$/g, '') || 'YouTube Video';
          
          links.push({
            title,
            url: fullUrl,
            snippet: line,
            source,
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
          });
        }
      }
    }
  }
  
  return links;
};

export const getYouTubeThumbnail = (url: string): string | undefined => {
  // Extract YouTube video ID from various YouTube URL formats including Shorts
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const videoId = match[1];
      // Return high quality thumbnail (maxresdefault), fallback to medium quality
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
  }
  
  return undefined;
};

export const decodeHtmlEntities = (text: string): string => {
  const htmlEntities: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
  };
  
  return text.replace(/&[#\w]+;/g, (entity) => {
    return htmlEntities[entity] || entity;
  });
};

export const fetchOGImage = async (url: string): Promise<string | undefined> => {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    
    // For YouTube, use the existing thumbnail function
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      return getYouTubeThumbnail(url);
    }
    
    // Try LinkPreview API first if available
    if (process.env.LINKPREVIEW_API_KEY) {
      try {
        const linkPreviewResponse = await fetch(`https://api.linkpreview.net/?key=${process.env.LINKPREVIEW_API_KEY}&q=${encodeURIComponent(url)}`);
        const linkPreviewData = await linkPreviewResponse.json();
        
        if (linkPreviewData.image && !linkPreviewData.error) {
          return linkPreviewData.image;
        }
      } catch (linkPreviewError) {
        console.warn('LinkPreview API failed, falling back to screenshot service:', linkPreviewError);
      }
    }
    
    // Use a screenshot service for articles as fallback
    return `https://shot.screenshotapi.net/screenshot?token=6QNP0PC-KJJH9CC-JAMV8RZ-WAFKXDW&url=${encodeURIComponent(url)}&width=400&height=200&output=image&file_type=png&wait_for_event=load`;
    
  } catch (error) {
    console.error('Error fetching OG image:', error);
    // Fallback to a domain-based placeholder
    const domain = url.split('/')[2] || 'Article';
    return `https://via.placeholder.com/400x200/374151/9CA3AF?text=${encodeURIComponent(domain)}`;
  }
};

