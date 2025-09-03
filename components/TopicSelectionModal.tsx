'use client'

import { useState, useEffect } from 'react'
import { X, Check } from 'phosphor-react'
import TopicCard from './TopicCard'

interface TopicSuggestion {
  name: string
  description: string
  imageUrl?: string | null
  imageId?: string | null
  color?: string | null
  selected: boolean
  editing?: boolean
}

interface TopicSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  hubId: number
  hubName: string
  hubDescription?: string
  onComplete: () => Promise<void>
  onNavigateToHub?: () => void
  excludeTopics?: string[]
  existingTopicImages?: string[]
}

export default function TopicSelectionModal({ 
  isOpen, 
  onClose, 
  hubId, 
  hubName, 
  hubDescription,
  onComplete,
  onNavigateToHub,
  excludeTopics = [],
  existingTopicImages = []
}: TopicSelectionModalProps) {
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [giphyError, setGiphyError] = useState<string | null>(null)
  const [usedGiphyIds, setUsedGiphyIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen && suggestions.length === 0) {
      // Extract Giphy IDs from existing topic images
      const existingGiphyIds = new Set<string>()
      existingTopicImages.forEach(imageUrl => {
        // Extract Giphy ID from URL if it's a Giphy image
        // The actual Giphy ID is the last part before the file extension in the URL
        // e.g., https://media.giphy.com/media/.../vIG0OEdkPnNSn0CMK8/100w.gif
        const parts = imageUrl?.split('/') || []
        const filenamePart = parts[parts.length - 1] // Get "100w.gif" or similar
        const idPart = parts[parts.length - 2] // Get the ID part
        
        // The ID is the last segment before the size/format
        if (idPart && imageUrl?.includes('giphy.com')) {
          existingGiphyIds.add(idPart)
          console.log('Found existing Giphy ID from URL:', idPart)
        }
      })
      
      // Set initial used IDs from existing topics
      setUsedGiphyIds(existingGiphyIds)
      fetchSuggestions(excludeTopics)
    }
  }, [isOpen, excludeTopics, existingTopicImages])

  const fetchSuggestions = async (additionalExclude: string[] = []) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/topics/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hubName,
          hubDescription,
          excludeTopics: additionalExclude
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch topic suggestions')
      }

      const data = await response.json()
      
      // Initialize suggestions with default values
      const initializedSuggestions: TopicSuggestion[] = data.suggestions.map((suggestion: any) => ({
        name: suggestion.name,
        description: suggestion.description,
        imageUrl: undefined, // Will be fetched when needed
        color: undefined,
        selected: false, // Unselected by default
        editing: false
      }))

      setSuggestions(initializedSuggestions)
      
      // Fetch Giphy images for each suggestion after setting the initial state
      setTimeout(() => fetchGiphyImages(initializedSuggestions), 100)

    } catch (error) {
      console.error('Error fetching suggestions:', error)
      
      // Use the error message from the API if available
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Failed to generate topic suggestions. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchMoreSuggestions = async () => {
    setLoadingMore(true)
    setError(null)
    
    try {
      // Get existing topic names to exclude (both from current suggestions and existing topics in hub)
      const existingTopicNames = [...excludeTopics, ...suggestions.map(s => s.name)]
      
      const response = await fetch('/api/topics/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hubName,
          hubDescription,
          excludeTopics: existingTopicNames
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch more topic suggestions')
      }

      const data = await response.json()
      
      // Initialize new suggestions with default values
      const newSuggestions: TopicSuggestion[] = data.suggestions.map((suggestion: any) => ({
        name: suggestion.name,
        description: suggestion.description,
        imageUrl: undefined,
        color: undefined,
        selected: false,
        editing: false
      }))

      // Append to existing suggestions
      setSuggestions(prev => [...prev, ...newSuggestions])
      
      // Fetch Giphy images for new suggestions
      setTimeout(() => fetchGiphyImages(newSuggestions, suggestions.length), 100)

    } catch (error) {
      console.error('Error fetching more suggestions:', error)
      
      // Use the error message from the API if available
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Failed to generate more topic suggestions. Please try again.')
      }
    } finally {
      setLoadingMore(false)
    }
  }

  const generateOptimalQuery = async (topicName: string, topicDescription: string) => {
    try {
      console.log(`Generating optimal query for "${topicName}" in "${hubName}"`)
      
      const response = await fetch('/api/giphy-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hubName,
          hubDescription: hubDescription || '',
          topicName,
          topicDescription,
          // Add more context for better search results
          fullContext: `Hub: "${hubName}"${hubDescription ? ` (${hubDescription})` : ''}. Topic: "${topicName}" - ${topicDescription}. Generate optimal Giphy search terms.`
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`OpenAI generated query for "${topicName}": "${data.query}"`)
        return data.query
      } else {
        console.warn('Failed to generate optimal query, using fallback')
        // Fallback to simple concatenation
        return hubName ? `${topicName} ${hubName}` : topicName
      }
    } catch (error) {
      console.error('Error generating optimal query:', error)
      // Fallback to simple concatenation
      return hubName ? `${topicName} ${hubName}` : topicName
    }
  }

  const fetchGiphyImages = async (suggestionsList: TopicSuggestion[], startIndex: number = 0) => {
    console.log('Fetching Giphy images for:', suggestionsList.map(s => s.name))
    setGiphyError(null) // Clear any previous errors
    
    // Fetch images one by one
    for (let i = 0; i < suggestionsList.length; i++) {
      const suggestion = suggestionsList[i]
      const optimalQuery = await generateOptimalQuery(suggestion.name, suggestion.description)
      
      try {
        console.log(`Fetching image for: ${suggestion.name} with AI-generated query: ${optimalQuery}`)
        
        let foundUniqueImage = false
        let attemptCount = 0
        const maxAttempts = 10 // Try up to 10 different offsets to find unique image
        
        while (!foundUniqueImage && attemptCount < maxAttempts) {
          // Use random offset to get more variety in images
          const offset = attemptCount * 5 + Math.floor(Math.random() * 5)
          const response = await fetch(`/api/giphy?q=${encodeURIComponent(optimalQuery)}&limit=1&offset=${offset}`)
          
          console.log(`Response status for ${suggestion.name} (offset ${offset}):`, response.status)
          
          if (response.ok) {
            const data = await response.json()
            console.log(`Data for ${suggestion.name}:`, data)
            
            if (data.imageUrl && data.imageId) {
              // Check if this image ID is already used
              if (!usedGiphyIds.has(data.imageId)) {
                console.log(`Setting unique image for ${suggestion.name}:`, data.imageUrl, `(ID: ${data.imageId})`)
                
                // Add the ID to used set
                setUsedGiphyIds(prev => {
                  const newSet = new Set(Array.from(prev).concat([data.imageId]))
                  console.log(`Updated used Giphy IDs (${newSet.size} total):`, Array.from(newSet))
                  return newSet
                })
                
                // Update suggestion with image and ID
                setSuggestions(prev => 
                  prev.map((s, index) => 
                    index === startIndex + i ? { 
                      ...s, 
                      imageUrl: data.imageUrl,
                      imageId: data.imageId 
                    } : s
                  )
                )
                foundUniqueImage = true
              } else {
                console.log(`Image ID ${data.imageId} already used, trying next offset`)
                attemptCount++
              }
            } else if (data.imageUrl === null) {
              // No more images available
              console.log(`No more images available for ${suggestion.name}`)
              setSuggestions(prev => 
                prev.map((s, index) => 
                  index === startIndex + i ? { ...s, imageUrl: null, imageId: null } : s
                )
              )
              foundUniqueImage = true
            } else {
              attemptCount++
            }
          } else {
            break // Exit on API error
          }
        }
        
        if (!foundUniqueImage && attemptCount >= maxAttempts) {
          console.log(`Could not find unique image for ${suggestion.name} after ${maxAttempts} attempts`)
          setSuggestions(prev => 
            prev.map((s, index) => 
              index === startIndex + i ? { ...s, imageUrl: null, imageId: null } : s
            )
          )
        }
      } catch (error) {
        console.error(`Error fetching image for topic "${suggestion.name}":`, error)
        setSuggestions(prev => 
          prev.map((s, index) => 
            index === startIndex + i ? { ...s, imageUrl: null } : s
          )
        )
        
        // If it's a JSON parsing error, likely rate limited
        if (error instanceof Error && error.message.includes('Unexpected token')) {
          setGiphyError('Giphy API rate limit exceeded. Images are temporarily unavailable.')
          break
        }
      }
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    console.log('Finished fetching all images')
  }

  const toggleSelection = (index: number) => {
    setSuggestions(prev => 
      prev.map((suggestion, i) => 
        i === index ? { ...suggestion, selected: !suggestion.selected } : suggestion
      )
    )
  }

  const toggleEditing = (index: number) => {
    setSuggestions(prev => 
      prev.map((suggestion, i) => 
        i === index ? { ...suggestion, editing: !suggestion.editing } : suggestion
      )
    )
  }

  const updateSuggestion = (index: number, updates: Partial<TopicSuggestion>) => {
    setSuggestions(prev => 
      prev.map((suggestion, i) => 
        i === index ? { ...suggestion, ...updates } : suggestion
      )
    )
  }

  const selectedCount = suggestions.filter(s => s.selected).length

  const handleCreateTopics = async () => {
    const selectedTopics = suggestions.filter(s => s.selected)
    
    if (selectedTopics.length === 0) {
      return
    }

    setCreating(true)
    try {
      // Create topics in bulk
      const response = await fetch('/api/topics/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hubId,
          topics: selectedTopics.map(topic => ({
            name: topic.name,
            description: topic.description,
            imageUrl: topic.imageUrl,
            color: topic.color
          }))
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create topics')
      }

      await onComplete()
      
      // Navigate to hub page if callback is provided
      if (onNavigateToHub) {
        onNavigateToHub()
      }
      
      onClose()
      
    } catch (error) {
      console.error('Error creating topics:', error)
      setError('Failed to create topics. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-dark rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-700">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-semibold text-white">Organize Your Hub</h2>
            <p className="text-gray-400 mt-1">
              Select and customize topics to help structure "{hubName}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            disabled={creating}
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-hubcap-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-300">Generating topic suggestions...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => fetchSuggestions()}
              className="px-4 py-2 bg-hubcap-accent rounded-md hover:bg-opacity-80 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Giphy Error Message */}
              {giphyError && (
                <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-md">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 text-sm">⚠️</span>
                    <p className="text-yellow-200 text-sm">{giphyError}</p>
                  </div>
                </div>
              )}
              
              {/* Select All Checkbox */}
              <div className="mb-4 flex items-center justify-between p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const allSelected = suggestions.every(s => s.selected)
                      setSuggestions(prev => prev.map(s => ({ ...s, selected: !allSelected })))
                    }}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                      suggestions.every(s => s.selected)
                        ? 'bg-hubcap-accent border-hubcap-accent'
                        : suggestions.some(s => s.selected)
                        ? 'bg-hubcap-accent/50 border-hubcap-accent'
                        : 'border-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {(suggestions.every(s => s.selected) || suggestions.some(s => s.selected)) && 
                      <Check size={14} weight="bold" className="text-white" />
                    }
                  </button>
                  <label className="text-white font-medium cursor-pointer select-none"
                    onClick={() => {
                      const allSelected = suggestions.every(s => s.selected)
                      setSuggestions(prev => prev.map(s => ({ ...s, selected: !allSelected })))
                    }}
                  >
                    {suggestions.every(s => s.selected) 
                      ? 'Deselect All' 
                      : suggestions.some(s => s.selected)
                      ? `${selectedCount} of ${suggestions.length} selected`
                      : 'Select All'
                    }
                  </label>
                </div>
                <span className="text-gray-400 text-sm">
                  {suggestions.length} topic{suggestions.length !== 1 ? 's' : ''} available
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestions.map((suggestion, index) => (
                  <TopicCard
                    key={index}
                    mode="suggestion"
                    suggestion={suggestion}
                    onToggleSelection={() => toggleSelection(index)}
                    onToggleEditing={() => toggleEditing(index)}
                    onUpdate={(updates) => updateSuggestion(index, updates)}
                    hubName={hubName}
                    hubDescription={hubDescription}
                  />
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 bg-gray-800">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-white font-medium">
                      {selectedCount} topic{selectedCount !== 1 ? 's' : ''} selected
                    </p>
                    <p className="text-gray-400 text-sm">
                      Choose topics that will help organize content in your hub
                    </p>
                  </div>
                  <button
                    onClick={fetchMoreSuggestions}
                    disabled={loadingMore || loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md transition-colors text-sm"
                  >
                    {loadingMore ? 'Loading...' : 'Browse More'}
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                    disabled={creating}
                  >
                    Skip for Now
                  </button>
                  <button
                    onClick={handleCreateTopics}
                    disabled={selectedCount === 0 || creating}
                    className="px-6 py-2 bg-hubcap-accent hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors"
                  >
                    {creating 
                      ? 'Adding Topics...' 
                      : selectedCount === 0 
                      ? 'Select Topics' 
                      : `Add ${selectedCount} Topic${selectedCount !== 1 ? 's' : ''}`
                    }
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}