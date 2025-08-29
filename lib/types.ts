export interface Link {
  id?: number;
  title: string;
  url: string;
  snippet: string;
  source: string;
  category: 'long_form_videos' | 'short_form_videos' | 'articles' | 'podcasts' | 'images';
  topic: string;
  thumbnail?: string;
  embedding?: Float32Array;
  feedback?: 'like' | 'discard' | null;
  created_at?: string;
}

export interface SearchRequest {
  topic: string;
}

export interface SearchResponse {
  long_form_videos: Link[];
  short_form_videos: Link[];
  articles: Link[];
  podcasts: Link[];
  images: Link[];
}

export interface FeedbackRequest {
  linkId: number;
  feedback: 'like' | 'discard';
}

export interface MoreLinksRequest {
  topic: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnails: {
    default: { url: string };
    medium: { url: string };
    high: { url: string };
  };
}

export interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}