'use client'

import { useState, useEffect } from 'react'
import { ArrowsClockwise, MagnifyingGlass } from 'phosphor-react'
import HubLogo from './HubLogo'

interface GiphyImage {
  id: string
  url: string
  title: string
}

interface HubGiphyImagePickerProps {
  query: string
  selectedImageUrl: string | null
  onImageSelect: (imageUrl: string) => void
  showQuery?: boolean
  onQueryGenerate?: () => Promise<string>
  hubName: string
  hubColor?: string | null
}

export default function HubGiphyImagePicker({ 
  query, 
  selectedImageUrl, 
  onImageSelect, 
  showQuery = false, 
  onQueryGenerate,
  hubName,
  hubColor
}: HubGiphyImagePickerProps) {
  const [images, setImages] = useState<GiphyImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [displayQuery, setDisplayQuery] = useState<string>(query)
  const [generatingQuery, setGeneratingQuery] = useState(false)
  const [customQuery, setCustomQuery] = useState<string>('')
  const [isUsingCustomQuery, setIsUsingCustomQuery] = useState(false)
  const [showCustomSearch, setShowCustomSearch] = useState(false)

  // Determine which query to use for search
  const activeQuery = isUsingCustomQuery && customQuery.trim() ? customQuery : query

  useEffect(() => {
    const fetchImages = async () => {
      if (!activeQuery.trim()) {
        setImages([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/giphy?q=${encodeURIComponent(activeQuery)}&limit=5&offset=${offset}`)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          
          if (response.status === 429 || errorData.rateLimited) {
            throw new Error('Giphy API rate limit exceeded. Please try again later.')
          } else {
            throw new Error(errorData.error || 'Failed to fetch images')
          }
        }

        const data = await response.json()
        const fetchedImages = data.images || []
        setImages(fetchedImages)
        
        // Auto-select first image if no image is currently selected
        if (fetchedImages.length > 0 && !selectedImageUrl) {
          onImageSelect(fetchedImages[0].url)
        }
      } catch (err) {
        let errorMessage = err instanceof Error ? err.message : 'Unknown error'
        
        // Handle JSON parsing errors (likely rate limit HTML responses)
        if (errorMessage.includes('Unexpected token')) {
          errorMessage = 'Giphy API rate limit exceeded. Please try again later.'
        }
        
        setError(errorMessage)
        setImages([])
      } finally {
        setLoading(false)
      }
    }

    // Debounce the API call
    const debounceTimer = setTimeout(fetchImages, 500)
    return () => clearTimeout(debounceTimer)
  }, [activeQuery, offset])

  // Reset offset when query changes and update display query
  useEffect(() => {
    setOffset(0)
    setDisplayQuery(query)
    // Reset custom query when main query changes
    if (!isUsingCustomQuery) {
      setCustomQuery('')
    }
  }, [query])

  const handleGenerateQuery = async () => {
    if (!onQueryGenerate) return
    
    setGeneratingQuery(true)
    try {
      const newQuery = await onQueryGenerate()
      setDisplayQuery(newQuery)
      // Also update custom query field if it's visible
      if (showCustomSearch) {
        setCustomQuery(newQuery)
        setIsUsingCustomQuery(true)
      }
    } catch (error) {
      console.error('Failed to generate query:', error)
    } finally {
      setGeneratingQuery(false)
    }
  }

  const handleRefresh = () => {
    setOffset(prev => prev + 5)
  }

  const handleCustomSearch = () => {
    if (customQuery.trim()) {
      setIsUsingCustomQuery(true)
      setOffset(0)
    }
  }

  const handleResetToDefault = () => {
    setIsUsingCustomQuery(false)
    setCustomQuery('')
    setOffset(0)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-300">Choose Hub Image</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCustomSearch(!showCustomSearch)}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-gray-300 flex items-center gap-1"
            title="Custom search"
          >
            <MagnifyingGlass size={16} />
            <span className="text-xs">Custom</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Load more images"
          >
            <ArrowsClockwise 
              size={16}
              className={loading ? 'animate-spin' : ''}
            />
          </button>
        </div>
      </div>
      
      {/* Hub Logo Preview */}
      <div className="flex justify-center mb-6">
        <HubLogo
          hubName={hubName}
          imageUrl={selectedImageUrl}
          color={hubColor}
          size={100}
          loading={loading && !selectedImageUrl}
          showLoading={true}
          borderWidth={2}
          className="drop-shadow-lg"
        />
      </div>
      
      {/* Display current search query */}
      {(showQuery || isUsingCustomQuery) && (
        <div className="mb-3 p-2 bg-gray-800 rounded-md border border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <span className="text-xs text-gray-400">
                {isUsingCustomQuery ? 'Custom search:' : 'AI suggested:'}
              </span>
              <p className="text-sm text-gray-200 font-mono">{activeQuery}</p>
            </div>
            <div className="flex items-center gap-1">
              {isUsingCustomQuery && (
                <button
                  onClick={handleResetToDefault}
                  className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                  title="Reset to default"
                >
                  Reset
                </button>
              )}
              {onQueryGenerate && (
                <button
                  onClick={handleGenerateQuery}
                  disabled={generatingQuery || loading}
                  className="text-xs px-2 py-1 bg-hubcap-accent hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors"
                  title="Generate AI-optimized search query"
                >
                  {generatingQuery ? '...' : 'AI'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom search input */}
      {showCustomSearch && (
        <div className="mb-3 p-3 bg-gray-800 rounded-md border border-gray-600">
          <label className="block text-xs text-gray-400 mb-1">Custom Giphy Search</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
              placeholder={`e.g., "${hubName} logo" or "abstract ${hubName}"`}
              className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-hubcap-accent"
            />
            <button
              onClick={handleCustomSearch}
              disabled={!customQuery.trim() || loading}
              className="px-3 py-1 bg-hubcap-accent hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm transition-colors"
            >
              Search
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Override the AI search to find exactly what you want
          </p>
        </div>
      )}

      {!activeQuery.trim() ? (
        <div className="text-center text-gray-400 py-8">
          <p>Enter a hub name to see image suggestions</p>
        </div>
      ) : loading ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 text-gray-300">
            <div className="w-4 h-4 border-2 border-hubcap-accent border-t-transparent rounded-full animate-spin"></div>
            Searching for images...
          </div>
        </div>
      ) : error ? (
        <div className="text-center text-red-400 py-8">
          <p>Error loading images: {error}</p>
        </div>
      ) : images.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <p>No images found for "{activeQuery}"</p>
          {isUsingCustomQuery && (
            <button
              onClick={handleResetToDefault}
              className="mt-2 text-xs text-hubcap-accent hover:underline"
            >
              Try default search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {/* Image Options */}
          {images.map((image) => (
            <button
              key={image.id}
              onClick={() => onImageSelect(image.url)}
              className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                selectedImageUrl === image.url
                  ? 'border-hubcap-accent ring-2 ring-hubcap-accent ring-opacity-50'
                  : 'border-gray-600 hover:border-gray-400'
              }`}
              title={image.title}
            >
              <img
                src={image.url}
                alt={image.title}
                className="w-full h-full object-cover"
              />
              {selectedImageUrl === image.url && (
                <div className="absolute inset-0 bg-hubcap-accent bg-opacity-20 flex items-center justify-center">
                  <div className="w-3 h-3 bg-hubcap-accent rounded-full"></div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}