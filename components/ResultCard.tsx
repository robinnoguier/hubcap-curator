import { useState } from 'react'
import { Link } from '@/lib/types'

interface LinkWithId extends Link {
  id: number;
  isPlaying?: boolean;
}

interface ResultCardProps {
  link: LinkWithId
  onFeedback: (linkId: number, feedback: 'like' | 'discard') => void
  onToggleVideo?: (linkId: number) => void
  onRemove: (linkId: number) => void
}

export default function ResultCard({ link, onFeedback, onToggleVideo, onRemove }: ResultCardProps) {
  const [isCopied, setIsCopied] = useState(false)
  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onToggleVideo) {
      onToggleVideo(link.id)
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove(link.id)
  }

  const handleCardClick = () => {
    window.open(link.url, '_blank', 'noopener,noreferrer')
  }

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(link.url)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const isVideo = link.source === 'YouTube' || link.url.includes('youtube.com') || link.url.includes('youtu.be')
  const isPodcast = link.category === 'podcasts' || link.source === 'Apple Podcasts'
  const isImage = link.category === 'images' || link.source === 'Unsplash'
  
  const getYouTubeVideoId = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }
  
  const videoId = getYouTubeVideoId(link.url)

  return (
    <div 
      className="bg-gray-800 rounded-lg overflow-hidden hover-scale hover:bg-gray-750 transition-all duration-200 border border-gray-700 hover:border-gray-600 cursor-pointer relative flex flex-col"
      onClick={handleCardClick}
    >
      <button
        onClick={handleRemove}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-900 bg-opacity-80 hover:bg-red-500 transition-all duration-200 flex items-center justify-center text-white text-xs z-10"
        title="Remove"
      >
        ✕
      </button>

      {link.isPlaying && videoId && (
        <div className="relative">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title={link.title}
            className="w-full h-48"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {!link.isPlaying && link.thumbnail && (
        <div className="relative">
          <img 
            src={link.thumbnail} 
            alt={link.title}
            className="w-full h-48 object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.includes('maxresdefault')) {
                target.src = target.src.replace('maxresdefault', 'mqdefault');
              } else if (target.src.includes('mqdefault')) {
                target.src = target.src.replace('mqdefault', 'default');
              }
            }}
          />
          {isVideo && onToggleVideo && (
            <div 
              className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center cursor-pointer"
              onClick={handlePlayClick}
            >
              <div className="w-16 h-16 bg-red-600 bg-opacity-80 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors">
                <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          )}
          {!isVideo && (
            <div className="absolute top-2 left-2">
              {isPodcast ? (
                <div className="bg-purple-600 bg-opacity-80 rounded-full p-2">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15V7l5 5-5 5z"/>
                  </svg>
                </div>
              ) : isImage ? (
                <div className="bg-green-600 bg-opacity-80 rounded-full p-2">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                </div>
              ) : (
                <div className="bg-blue-600 bg-opacity-80 rounded-full p-2">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {!link.thumbnail && (
        <div className="h-48 bg-gray-700 flex justify-start items-start relative">
          <div className="text-center">
            {isVideo ? (
              <div className="w-16 h-16 bg-red-600 bg-opacity-80 rounded-full flex justify-start items-start mx-auto mb-2">
                <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            ) : isPodcast ? (
              <div className="bg-purple-600 bg-opacity-80 rounded-full p-4 mx-auto mb-2">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15V7l5 5-5 5z"/>
                </svg>
              </div>
            ) : isImage ? (
              <div className="bg-green-600 bg-opacity-80 rounded-full p-4 mx-auto mb-2">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
              </div>
            ) : (
              <div className="bg-blue-600 bg-opacity-80 rounded-full p-4 mx-auto mb-2">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </div>
            )}
            <p className="text-gray-300 text-sm">
              {isVideo ? 'Video' : isPodcast ? 'Podcast' : isImage ? 'Image' : 'Article'}
            </p>
          </div>
        </div>
      )}
      
      <div className="p-4 flex flex-col h-full">
        <div className="flex justify-start items-start mb-3">
          <span className={`text-xs px-2 py-1 rounded-full ${
            link.source === 'OpenAI' 
              ? 'bg-black text-white border border-gray-600'
              : link.source === 'Perplexity'
              ? 'bg-green-500 text-white'
              : link.source === 'YouTube'
              ? 'bg-red-600 text-white'
              : link.source === 'Apple Podcasts'
              ? 'bg-purple-600 text-white'
              : link.source === 'Unsplash'
              ? 'bg-emerald-500 text-white'
              : 'bg-hubcap-accent bg-opacity-20 text-hubcap-accent'
          }`}>
            {link.source}
          </span>
        </div>
        
        <h3 className="font-semibold mb-2 text-sm line-clamp-2 leading-tight">
          {link.title}
        </h3>
        
        <p className="text-gray-400 text-xs mb-3 line-clamp-3 leading-relaxed flex-grow">
          {link.snippet}
        </p>
        
        <button
          onClick={handleCopyLink}
          className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-xs rounded-md transition-colors duration-200 flex items-center justify-center gap-2 mt-auto"
        >
          {isCopied ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Link
            </>
          )}
        </button>
      </div>
    </div>
  )
}