'use client'

import { useState, useEffect } from 'react'
import HubGiphyImagePicker from './HubGiphyImagePicker'
import ColorPicker from './ColorPicker'

interface Hub {
  id: number
  name: string
  description?: string
  image_url?: string
  color?: string
  member_nickname_plural?: string
  fake_online_count?: number
  created_at: string
  updated_at: string
}

interface CreateHubModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (hubData: {
    name: string
    description?: string
    imageUrl?: string | null
    color?: string | null
    memberNicknamePlural?: string | null
    fakeOnlineCount?: number | null
  }) => Promise<Hub | void>
  isEditMode?: boolean
  initialData?: {
    name: string
    description?: string
    imageUrl?: string | null
    color?: string | null
    memberNicknamePlural?: string | null
    fakeOnlineCount?: number | null
  }
  onHubCreated?: (hub: Hub) => void
}


export default function CreateHubModal({ isOpen, onClose, onCreate, isEditMode = false, initialData, onHubCreated }: CreateHubModalProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(initialData?.imageUrl || null)
  const [selectedColor, setSelectedColor] = useState<string | null>(initialData?.color || null)
  const [suggestTopics, setSuggestTopics] = useState(true) // On by default
  const [creating, setCreating] = useState(false)
  const [giphyQuery, setGiphyQuery] = useState<string>(initialData?.name || '')
  
  // New states for member nickname
  const [selectedNickname, setSelectedNickname] = useState<string | 'None'>(
    initialData?.memberNicknamePlural || 'None'
  )
  const [nicknameSuggestions, setNicknameSuggestions] = useState<string[]>([])
  const [loadingNicknames, setLoadingNicknames] = useState(false)

  // Update state when initialData changes or modal opens
  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name || '')
      setDescription(initialData.description || '')
      setSelectedImageUrl(initialData.imageUrl || null)
      setSelectedColor(initialData.color || null)
      setGiphyQuery(initialData.name || '')
      setSelectedNickname(initialData.memberNicknamePlural || 'None')
    }
  }, [isOpen, initialData])
  
  // Fetch AI-generated nickname suggestions when hub name changes
  useEffect(() => {
    if (name.trim() && !isEditMode) {
      const fetchNicknames = async () => {
        setLoadingNicknames(true)
        try {
          const response = await fetch('/api/hub-nicknames', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              hubName: name,
              hubDescription: description 
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            setNicknameSuggestions(data.suggestions || [])
          }
        } catch (error) {
          console.error('Error fetching nicknames:', error)
        } finally {
          setLoadingNicknames(false)
        }
      }
      
      // Debounce the API call
      const timer = setTimeout(fetchNicknames, 500)
      return () => clearTimeout(timer)
    }
  }, [name, description, isEditMode])

  // Auto-generate query when name or description changes
  useEffect(() => {
    if (name.trim() && !isEditMode) {
      // Debounce the query generation
      const debounceTimer = setTimeout(() => {
        generateHubQuery()
      }, 1000)
      return () => clearTimeout(debounceTimer)
    }
  }, [name, description])

  const generateHubQuery = async () => {
    if (!name.trim()) {
      setGiphyQuery('')
      return ''
    }

    try {
      const response = await fetch('/api/giphy-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hubName: name,
          hubDescription: description,
          topicName: name, // For hubs, use the hub name as topic name
          topicDescription: description
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`AI generated hub query: "${data.query}"`)
        setGiphyQuery(data.query)
        return data.query
      } else {
        console.warn('Failed to generate hub query, using fallback')
        const fallback = name
        setGiphyQuery(fallback)
        return fallback
      }
    } catch (error) {
      console.error('Error generating hub query:', error)
      const fallback = name
      setGiphyQuery(fallback)
      return fallback
    }
  }

  
  const handleClose = () => {
    if (!isEditMode) {
      setName('')
      setDescription('')
      setSelectedImageUrl(null)
      setSelectedColor(null)
      setSuggestTopics(true) // Reset to default
      setGiphyQuery('')
      setSelectedNickname('None')
      setNicknameSuggestions([])
    }
    onClose()
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    
    setCreating(true)
    try {
      // Process the nickname - null if "None" selected
      const processedNickname = selectedNickname === 'None' ? null : selectedNickname
      
      // Always randomize the online count
      const processedCount = Math.floor(Math.random() * 150) + 1
      
      const result = await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        imageUrl: selectedImageUrl,
        color: selectedColor,
        memberNicknamePlural: processedNickname,
        fakeOnlineCount: processedCount
      })
      
      // If we're creating a new hub and got a hub object back, conditionally trigger the callback
      if (!isEditMode && result && 'id' in result) {
        if (suggestTopics && onHubCreated) {
          // Show topic suggestions
          onHubCreated(result as Hub)
        } else {
          // Skip topic suggestions and close
          handleClose()
        }
      } else {
        handleClose()
      }
    } catch (error) {
      console.error('Error creating hub:', error)
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-dark rounded-lg p-6 w-full max-w-lg border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">{isEditMode ? 'Edit Hub' : 'Create New Hub'}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Hub Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Hyrox, Tech, Health"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:border-transparent text-white placeholder-gray-400"
              maxLength={50}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this hub will contain..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:border-transparent text-white placeholder-gray-400 resize-none"
              rows={3}
              maxLength={200}
            />
          </div>

          <div>
            <HubGiphyImagePicker
              query={giphyQuery || name}
              selectedImageUrl={selectedImageUrl}
              onImageSelect={setSelectedImageUrl}
              showQuery={true}
              onQueryGenerate={generateHubQuery}
              hubName={name}
              hubColor={selectedColor}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Choose a Color
            </label>
            <ColorPicker
              selectedColor={selectedColor}
              onColorSelect={setSelectedColor}
            />
          </div>

          {/* Member Nickname Section - AI Powered! */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              AI Member Nicknames
            </label>
            {loadingNicknames ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-hubcap-accent"></div>
                <span className="ml-2 text-sm text-gray-400">Generating creative nicknames...</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {nicknameSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setSelectedNickname(suggestion)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedNickname === suggestion
                        ? 'bg-hubcap-accent text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedNickname('None')}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedNickname === 'None'
                      ? 'bg-hubcap-accent text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Default (members)
                </button>
              </div>
            )}
            {selectedNickname !== 'None' && (
              <p className="text-xs text-gray-400 mt-2">
                Selected: "{selectedNickname}"
              </p>
            )}
          </div>

          {/* Topic Suggestions Toggle - Only show when creating new hubs */}
          {!isEditMode && (
            <div className="flex items-center justify-between py-2">
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Suggest Topics
                </label>
                <p className="text-xs text-gray-400 mt-1">
                  Generate AI-powered topic suggestions for your hub
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSuggestTopics(!suggestTopics)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:ring-offset-2 focus:ring-offset-gray-800 ${
                  suggestTopics ? 'bg-hubcap-accent' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    suggestTopics ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            disabled={creating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="flex-1 px-4 py-2 bg-hubcap-accent hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors"
          >
            {creating ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Hub' : 'Create Hub')}
          </button>
        </div>
      </div>
    </div>
  )
}