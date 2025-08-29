'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface GiphyImage {
  id: string
  url: string
  title: string
}

interface GiphyImagePickerProps {
  query: string
  selectedImageUrl: string | null
  onImageSelect: (imageUrl: string) => void
}

export default function GiphyImagePicker({ query, selectedImageUrl, onImageSelect }: GiphyImagePickerProps) {
  const [images, setImages] = useState<GiphyImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchImages = async () => {
      if (!query.trim()) {
        setImages([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/giphy?q=${encodeURIComponent(query)}&limit=5`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch images')
        }

        const data = await response.json()
        setImages(data.images || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setImages([])
      } finally {
        setLoading(false)
      }
    }

    // Debounce the API call
    const debounceTimer = setTimeout(fetchImages, 500)
    return () => clearTimeout(debounceTimer)
  }, [query])

  if (!query.trim()) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p>Enter a hub name to see image suggestions</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-2 text-gray-300">
          <div className="w-4 h-4 border-2 border-hubcap-accent border-t-transparent rounded-full animate-spin"></div>
          Searching for images...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-400 py-8">
        <p>Error loading images: {error}</p>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p>No images found for "{query}"</p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-5 gap-2">
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
            <Image
              src={image.url}
              alt={image.title}
              width={64}
              height={64}
              className="w-full h-full object-cover"
              unoptimized
            />
            {selectedImageUrl === image.url && (
              <div className="absolute inset-0 bg-hubcap-accent bg-opacity-20 flex items-center justify-center">
                <svg className="w-4 h-4 text-hubcap-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}