import { useState } from 'react'
import { Link } from '@/lib/types'
import { Play, Image as ImageIcon, Article, X, Check, Copy } from 'phosphor-react'

interface LinkWithId extends Link {
  id: number;
  isPlaying?: boolean;
}

interface ResultCardProps {
  link: LinkWithId
  onFeedback: (linkId: number, feedback: 'like' | 'discard') => void
  onToggleVideo?: (linkId: number) => void
  onRemove: (linkId: number) => void
  isSelected?: boolean
  onSelectionChange?: (linkId: number, selected: boolean) => void
}

export default function ResultCard({ link, onFeedback, onToggleVideo, onRemove, isSelected = false, onSelectionChange }: ResultCardProps) {
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

  const handleCheckboxChange = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onSelectionChange) {
      onSelectionChange(link.id, !isSelected)
    }
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
      className="white-10 rounded-lg overflow-hidden hover-scale hover:bg-gray-750 transition-all duration-200 border border-gray-700 hover:border-gray-600 cursor-pointer relative flex flex-col"
      onClick={handleCardClick}
    >
      {/* Selection Checkbox - positioned on the left */}
      {onSelectionChange && (
        <button
          onClick={handleCheckboxChange}
          className={`absolute top-2 left-2 w-6 h-6 rounded border-2 transition-all duration-200 flex items-center justify-center z-10 ${
            isSelected 
              ? 'bg-blue-500 border-blue-500' 
              : 'bg-gray-900 bg-opacity-80 border-gray-600 hover:border-blue-400'
          }`}
          title="Select"
        >
          {isSelected && <Check size={14} weight="bold" className="text-white" />}
        </button>
      )}
      
      <button
        onClick={handleRemove}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-900 bg-opacity-80 hover:bg-red-500 transition-all duration-200 flex items-center justify-center text-white text-xs z-10"
        title="Remove"
      >
        <X size={12} />
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
                <Play size={24} weight="fill" className="text-white ml-1" />
              </div>
            </div>
          )}
          {!isVideo && (
            <div className="absolute top-2 left-2">
              {isPodcast ? (
                <div className="bg-purple-600 bg-opacity-80 rounded-full p-2">
                  <Play size={16} weight="fill" className="text-white" />
                </div>
              ) : isImage ? (
                <div className="bg-green-600 bg-opacity-80 rounded-full p-2">
                  <ImageIcon size={16} weight="fill" className="text-white" />
                </div>
              ) : (
                <div className="bg-blue-600 bg-opacity-80 rounded-full p-2">
                  <Article size={16} weight="fill" className="text-white" />
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
                <Play size={24} weight="fill" className="text-white ml-1" />
              </div>
            ) : isPodcast ? (
              <div className="bg-purple-600 bg-opacity-80 rounded-full p-4 mx-auto mb-2">
                <Play size={32} weight="fill" className="text-white" />
              </div>
            ) : isImage ? (
              <div className="bg-green-600 bg-opacity-80 rounded-full p-4 mx-auto mb-2">
                <ImageIcon size={32} weight="fill" className="text-white" />
              </div>
            ) : (
              <div className="bg-blue-600 bg-opacity-80 rounded-full p-4 mx-auto mb-2">
                <Article size={32} weight="fill" className="text-white" />
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
              : 'bg-hubcap-accent bg-opacity-20 text-white'
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
              <Check size={12} weight="bold" />
              Copied
            </>
          ) : (
            <>
              <Copy size={12} />
              Copy Link
            </>
          )}
        </button>
      </div>
    </div>
  )
}