'use client'

import { useState, useEffect } from 'react'
import { X, MagicWand, PencilSimple, Check, Database } from 'phosphor-react'
import GiphyImagePicker from './GiphyImagePicker'
import ColorPicker from './ColorPicker'
import MetadataSuggestionModal from './MetadataSuggestionModal'

interface SubtopicSuggestion {
  name: string
  description: string
  imageUrl?: string | null
  imageId?: string | null
  color?: string | null
  selected: boolean
  editing?: boolean
  normalized_name?: string
  metadata?: Record<string, any>
}

interface CreateSubtopicModalProps {
  isOpen: boolean
  onClose: () => void
  hubName: string
  hubDescription?: string
  topicName: string
  topicDescription?: string
  onCreate?: (subtopicData: {
    name: string
    description?: string
    imageUrl?: string | null
    color?: string | null
  }) => Promise<void>
  onCreateBulk?: (subtopics: SubtopicSuggestion[]) => Promise<void>
}

export default function CreateSubtopicModal({ 
  isOpen, 
  onClose, 
  hubName,
  hubDescription,
  topicName,
  topicDescription,
  onCreate,
  onCreateBulk
}: CreateSubtopicModalProps) {
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto')
  
  // Auto tab state
  const [subtopicDescription, setSubtopicDescription] = useState('')
  const [suggestions, setSuggestions] = useState<SubtopicSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [giphyError, setGiphyError] = useState<string | null>(null)
  const [usedGiphyIds, setUsedGiphyIds] = useState<Set<string>>(new Set())
  const [isExhaustive, setIsExhaustive] = useState(false)
  const [maxReached, setMaxReached] = useState(false)
  
  // Manual tab state
  const [manualName, setManualName] = useState('')
  const [manualDescription, setManualDescription] = useState('')
  const [manualImageUrl, setManualImageUrl] = useState<string | null>(null)
  const [manualColor, setManualColor] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // Metadata modal state
  const [showMetadataModal, setShowMetadataModal] = useState(false)

  const handleClose = () => {
    // Reset all state
    setActiveTab('auto')
    setSubtopicDescription('')
    setSuggestions([])
    setLoadingSuggestions(false)
    setLoadingMore(false)
    setError(null)
    setGiphyError(null)
    setUsedGiphyIds(new Set())
    setIsExhaustive(false)
    setMaxReached(false)
    setManualName('')
    setManualDescription('')
    setManualImageUrl(null)
    setManualColor(null)
    setCreating(false)
    setShowMetadataModal(false)
    onClose()
  }

  const fetchSuggestions = async (excludeSubtopics: string[] = []) => {
    if (!subtopicDescription.trim()) return
    
    setLoadingSuggestions(true)
    setError(null)
    
    try {
      const response = await fetch('/api/subtopics/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hubName,
          hubDescription,
          topicName,
          topicDescription,
          subtopicDescription: subtopicDescription.trim(),
          excludeSubtopics
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch subtopic suggestions')
      }

      const data = await response.json()
      
      // Initialize suggestions with default values
      const initializedSuggestions: SubtopicSuggestion[] = data.suggestions.map((suggestion: any) => ({
        name: suggestion.name,
        description: suggestion.description,
        imageUrl: undefined,
        color: undefined,
        selected: false,
        editing: false
      }))

      setSuggestions(initializedSuggestions)
      setIsExhaustive(data.isExhaustive || false)
      setMaxReached(data.maxReached || false)
      
      // Fetch Giphy images for each suggestion after setting the initial state
      setTimeout(() => fetchGiphyImages(initializedSuggestions), 100)

    } catch (error) {
      console.error('Error fetching suggestions:', error)
      setError('Failed to generate subtopic suggestions. Please try again.')
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const fetchMoreSuggestions = async () => {
    if (!subtopicDescription.trim() || maxReached) return
    
    setLoadingMore(true)
    setError(null)
    
    try {
      // Get existing subtopic names to exclude
      const existingSubtopicNames = suggestions.map(s => s.name)
      
      const response = await fetch('/api/subtopics/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hubName,
          hubDescription,
          topicName,
          topicDescription,
          subtopicDescription: subtopicDescription.trim(),
          excludeSubtopics: existingSubtopicNames
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch more subtopic suggestions')
      }

      const data = await response.json()
      
      // Initialize new suggestions with default values
      const newSuggestions: SubtopicSuggestion[] = data.suggestions.map((suggestion: any) => ({
        name: suggestion.name,
        description: suggestion.description,
        imageUrl: undefined,
        color: undefined,
        selected: false,
        editing: false
      }))

      // Append to existing suggestions
      setSuggestions(prev => [...prev, ...newSuggestions])
      setMaxReached(data.maxReached || false)
      
      // Fetch Giphy images for new suggestions
      setTimeout(() => fetchGiphyImages(newSuggestions, suggestions.length), 100)

    } catch (error) {
      console.error('Error fetching more suggestions:', error)
      setError('Failed to generate more subtopic suggestions. Please try again.')
    } finally {
      setLoadingMore(false)
    }
  }

  const generateOptimalQuery = async (subtopicName: string, subtopicDesc: string) => {
    try {
      console.log(`Generating optimal query for "${subtopicName}" in "${topicName}"`)
      
      const response = await fetch('/api/giphy-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hubName,
          hubDescription: hubDescription || '',
          topicName,
          topicDescription: topicDescription || '',
          subtopicName,
          subtopicDescription: subtopicDesc,
          fullContext: `Hub: "${hubName}"${hubDescription ? ` (${hubDescription})` : ''}. Topic: "${topicName}"${topicDescription ? ` - ${topicDescription}` : ''}. Subtopic: "${subtopicName}" - ${subtopicDesc}. Generate optimal Giphy search terms.`
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`AI generated query for "${subtopicName}": "${data.query}"`)
        return data.query
      } else {
        console.warn('Failed to generate optimal query, using fallback')
        return `${subtopicName} ${topicName}`
      }
    } catch (error) {
      console.error('Error generating optimal query:', error)
      return `${subtopicName} ${topicName}`
    }
  }

  const fetchGiphyImages = async (suggestionsList: SubtopicSuggestion[], startIndex: number = 0) => {
    console.log('Fetching Giphy images for:', suggestionsList.map(s => s.name))
    setGiphyError(null)
    
    // Fetch images one by one
    for (let i = 0; i < suggestionsList.length; i++) {
      const suggestion = suggestionsList[i]
      const optimalQuery = await generateOptimalQuery(suggestion.name, suggestion.description)
      
      try {
        console.log(`Fetching image for: ${suggestion.name} with AI-generated query: ${optimalQuery}`)
        
        let foundUniqueImage = false
        let offset = 0
        const maxAttempts = 5
        
        while (!foundUniqueImage && offset < maxAttempts) {
          const response = await fetch(`/api/giphy?q=${encodeURIComponent(optimalQuery)}&limit=1&offset=${offset}`)
          
          if (response.ok) {
            const data = await response.json()
            
            if (data.imageUrl && data.imageId) {
              if (!usedGiphyIds.has(data.imageId)) {
                console.log(`Setting unique image for ${suggestion.name}:`, data.imageUrl, `(ID: ${data.imageId})`)
                
                setUsedGiphyIds(prev => new Set(Array.from(prev).concat([data.imageId])))
                
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
                offset++
              }
            } else if (data.imageUrl === null) {
              console.log(`No more images available for ${suggestion.name}`)
              setSuggestions(prev => 
                prev.map((s, index) => 
                  index === startIndex + i ? { ...s, imageUrl: null, imageId: null } : s
                )
              )
              foundUniqueImage = true
            } else {
              offset++
            }
          } else {
            break
          }
        }
        
        if (!foundUniqueImage && offset >= maxAttempts) {
          console.log(`Could not find unique image for ${suggestion.name} after ${maxAttempts} attempts`)
          setSuggestions(prev => 
            prev.map((s, index) => 
              index === startIndex + i ? { ...s, imageUrl: null, imageId: null } : s
            )
          )
        }
      } catch (error) {
        console.error(`Error fetching image for subtopic "${suggestion.name}":`, error)
        setSuggestions(prev => 
          prev.map((s, index) => 
            index === startIndex + i ? { ...s, imageUrl: null } : s
          )
        )
        
        if (error instanceof Error && error.message.includes('Unexpected token')) {
          setGiphyError('Giphy API rate limit exceeded. Images are temporarily unavailable.')
          break
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200))
    }
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

  const updateSuggestion = (index: number, updates: Partial<SubtopicSuggestion>) => {
    setSuggestions(prev => 
      prev.map((suggestion, i) => 
        i === index ? { ...suggestion, ...updates } : suggestion
      )
    )
  }

  const handleGenerateSuggestions = () => {
    fetchSuggestions()
  }

  const handleCreateBulk = async () => {
    const selectedSubtopics = suggestions.filter(s => s.selected)
    
    if (selectedSubtopics.length === 0 || !onCreateBulk) {
      return
    }

    setCreating(true)
    try {
      await onCreateBulk(selectedSubtopics)
      handleClose()
    } catch (error) {
      console.error('Error creating subtopics:', error)
      setError('Failed to create subtopics. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleCreateManual = async () => {
    if (!manualName.trim() || !onCreate) return
    
    setCreating(true)
    try {
      await onCreate({
        name: manualName.trim(),
        description: manualDescription.trim() || undefined,
        imageUrl: manualImageUrl,
        color: manualColor
      })
      handleClose()
    } catch (error) {
      console.error('Error creating subtopic:', error)
      setError('Failed to create subtopic. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleAddMetadata = () => {
    setShowMetadataModal(true)
  }

  const handleApplyMetadata = (enhancedSubtopics: SubtopicSuggestion[], selectedFields: string[]) => {
    // Update the suggestions with metadata
    setSuggestions(prev => 
      prev.map(suggestion => {
        const enhanced = enhancedSubtopics.find(es => es.name === suggestion.name)
        return enhanced ? { ...suggestion, ...enhanced } : suggestion
      })
    )
    setShowMetadataModal(false)
  }

  const selectedCount = suggestions.filter(s => s.selected).length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-dark rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-700">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-semibold text-white">Create Subtopics</h2>
            <p className="text-gray-400 mt-1">
              Add subtopics to organize content within "{topicName}"
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
            disabled={creating || loadingSuggestions || loadingMore}
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('auto')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'auto'
                ? 'text-hubcap-accent border-b-2 border-hubcap-accent bg-gray-800'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <MagicWand size={16} />
            Auto Generate
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'manual'
                ? 'text-hubcap-accent border-b-2 border-hubcap-accent bg-gray-800'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <PencilSimple size={16} />
            Manual Create
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'auto' ? (
            // Auto Generate Tab
            <div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Describe your subtopics *
                </label>
                <textarea
                  value={subtopicDescription}
                  onChange={(e) => setSubtopicDescription(e.target.value)}
                  placeholder="e.g., 'all stadiums in the world above 65k spectators' or 'different training methods for marathon runners'"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:border-transparent text-white placeholder-gray-400 resize-none"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Tip: Use "all" or "every" for comprehensive lists (up to 25 items)
                </p>
              </div>

              {!suggestions.length && !loadingSuggestions ? (
                <div className="text-center py-12">
                  <button
                    onClick={handleGenerateSuggestions}
                    disabled={!subtopicDescription.trim()}
                    className="px-6 py-3 bg-hubcap-accent hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors"
                  >
                    Generate Subtopics
                  </button>
                </div>
              ) : loadingSuggestions ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-hubcap-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-300">Generating subtopic suggestions...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button
                    onClick={() => fetchSuggestions()}
                    className="px-4 py-2 bg-hubcap-accent rounded-md hover:bg-opacity-80 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div>
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
                      {suggestions.length} subtopic{suggestions.length !== 1 ? 's' : ''} available
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {suggestions.map((suggestion, index) => (
                      <SubtopicSuggestionCard
                        key={index}
                        suggestion={suggestion}
                        onToggleSelection={() => toggleSelection(index)}
                        onToggleEditing={() => toggleEditing(index)}
                        onUpdate={(updates) => updateSuggestion(index, updates)}
                        hubName={hubName}
                        hubDescription={hubDescription}
                        topicName={topicName}
                        topicDescription={topicDescription}
                      />
                    ))}
                  </div>

                  {!maxReached && (
                    <div className="text-center mb-6">
                      <button
                        onClick={fetchMoreSuggestions}
                        disabled={loadingMore || !subtopicDescription.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md transition-colors text-sm"
                      >
                        {loadingMore ? 'Loading...' : 'Browse More'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Manual Create Tab
            <div className="max-w-lg mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subtopic Name *
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g., Camp Nou Stadium"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:border-transparent text-white placeholder-gray-400"
                  maxLength={100}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Brief description of this subtopic..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:border-transparent text-white placeholder-gray-400 resize-none"
                  rows={3}
                  maxLength={200}
                />
              </div>

              <div>
                <GiphyImagePicker
                  query={manualName}
                  selectedImageUrl={manualImageUrl}
                  onImageSelect={setManualImageUrl}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Choose a Color
                </label>
                <ColorPicker
                  selectedColor={manualColor}
                  onColorSelect={setManualColor}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-800">
          <div className="flex justify-between items-center">
            {activeTab === 'auto' ? (
              <>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-white font-medium">
                      {selectedCount} subtopic{selectedCount !== 1 ? 's' : ''} selected
                    </p>
                    <p className="text-gray-400 text-sm">
                      Choose subtopics to organize your content
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  {selectedCount > 0 && (
                    <button
                      onClick={handleAddMetadata}
                      disabled={creating}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-2"
                    >
                      <Database size={16} />
                      Continue
                    </button>
                  )}
                  <button
                    onClick={handleCreateBulk}
                    disabled={selectedCount === 0 || creating}
                    className="px-6 py-2 bg-hubcap-accent hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors"
                  >
                    {creating 
                      ? 'Adding Subtopics...' 
                      : selectedCount === 0 
                      ? 'Select Subtopics' 
                      : `Add ${selectedCount} Subtopic${selectedCount !== 1 ? 's' : ''}`
                    }
                  </button>
                </div>
              </>
            ) : (
              <>
                <div></div>
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateManual}
                    disabled={!manualName.trim() || creating}
                    className="px-6 py-2 bg-hubcap-accent hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors"
                  >
                    {creating ? 'Creating...' : 'Create Subtopic'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Metadata Suggestion Modal */}
      <MetadataSuggestionModal
        isOpen={showMetadataModal}
        onClose={() => setShowMetadataModal(false)}
        selectedSubtopics={suggestions.filter(s => s.selected).map(s => ({
          ...s,
          normalized_name: s.normalized_name || s.name.toLowerCase().replace(/\s+/g, '_'),
          metadata: s.metadata || {}
        }))}
        hubName={hubName}
        hubDescription={hubDescription}
        topicName={topicName}
        topicDescription={topicDescription}
        onApplyMetadata={handleApplyMetadata}
      />
    </div>
  )
}

// Subtopic Suggestion Card Component
interface SubtopicSuggestionCardProps {
  suggestion: SubtopicSuggestion
  onToggleSelection: () => void
  onToggleEditing: () => void
  onUpdate: (updates: Partial<SubtopicSuggestion>) => void
  hubName: string
  hubDescription?: string
  topicName: string
  topicDescription?: string
}

function SubtopicSuggestionCard({
  suggestion,
  onToggleSelection,
  onToggleEditing,
  onUpdate,
  hubName,
  hubDescription,
  topicName,
  topicDescription
}: SubtopicSuggestionCardProps) {
  const [editName, setEditName] = useState(suggestion.name)
  const [editDescription, setEditDescription] = useState(suggestion.description)
  const [currentQuery, setCurrentQuery] = useState<string>('')

  const generateOptimalQuery = async (name: string) => {
    try {
      const response = await fetch('/api/giphy-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hubName,
          hubDescription: hubDescription || '',
          topicName,
          topicDescription: topicDescription || '',
          subtopicName: name,
          subtopicDescription: editDescription
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentQuery(data.query)
        return data.query
      } else {
        const fallback = `${name} ${topicName}`
        setCurrentQuery(fallback)
        return fallback
      }
    } catch (error) {
      const fallback = `${name} ${topicName}`
      setCurrentQuery(fallback)
      return fallback
    }
  }

  const handleSaveEdit = () => {
    onUpdate({
      name: editName.trim() || suggestion.name,
      description: editDescription.trim() || suggestion.description,
      editing: false
    })
  }

  const handleCancelEdit = () => {
    setEditName(suggestion.name)
    setEditDescription(suggestion.description)
    onUpdate({ editing: false })
  }

  const handleToggleEditing = async () => {
    if (!suggestion.editing) {
      await generateOptimalQuery(suggestion.name)
    }
    onToggleEditing()
  }

  return (
    <div className={`relative bg-gray-700 rounded-lg p-4 border-2 transition-all duration-200 cursor-pointer ${
      suggestion.selected 
        ? 'border-hubcap-accent bg-opacity-20' 
        : 'border-gray-600 hover:border-gray-500'
    }`}>
      {/* Selection Checkbox */}
      <button
        onClick={onToggleSelection}
        className={`absolute top-3 right-3 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
          suggestion.selected
            ? 'bg-hubcap-accent border-hubcap-accent'
            : 'border-gray-400 hover:border-gray-300'
        }`}
      >
        {suggestion.selected && <Check size={14} weight="bold" className="text-white" />}
      </button>

      {/* Edit Button */}
      <button
        onClick={handleToggleEditing}
        className="absolute top-3 right-12 w-6 h-6 text-gray-400 hover:text-white transition-colors"
      >
        <PencilSimple size={14} />
      </button>

      <div onClick={onToggleSelection} className="cursor-pointer">
        <div className="flex flex-col items-center justify-center text-center gap-3 min-h-[120px]">
          {/* Subtopic Image */}
          <div className="w-16 h-16 flex-shrink-0 relative overflow-hidden rounded-lg bg-white/5">
            {suggestion.imageUrl ? (
              <img 
                src={suggestion.imageUrl} 
                alt={suggestion.name}
                className="w-full h-full object-cover"
                style={{
                  border: `2px solid ${suggestion.color || '#ffffff'}`,
                  borderRadius: '8px'
                }}
                onError={() => onUpdate({ imageUrl: null })}
              />
            ) : suggestion.imageUrl === null ? (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-xs">📷</span>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {suggestion.editing ? (
            <div className="space-y-3 mt-4 w-full" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                maxLength={100}
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-xs resize-none"
                rows={2}
                maxLength={200}
              />
              
              {/* Image Selection */}
              <div className="mt-3">
                <GiphyImagePicker
                  query={currentQuery || editName || suggestion.name}
                  selectedImageUrl={suggestion.imageUrl || null}
                  onImageSelect={(imageUrl) => onUpdate({ imageUrl })}
                  showQuery={true}
                  onQueryGenerate={async () => {
                    const query = await generateOptimalQuery(editName || suggestion.name)
                    return query
                  }}
                />
              </div>

              {/* Color Selection */}
              <div className="mt-3">
                <ColorPicker
                  selectedColor={suggestion.color || null}
                  onColorSelect={(color) => onUpdate({ color })}
                />
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-white">{suggestion.name}</h3>
              <p className="text-gray-300 text-sm leading-relaxed mt-1">{suggestion.description}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}