'use client'

import { useState, useEffect } from 'react'
import { Topic } from '@/lib/supabase'
import { Check, PencilSimple, Trash } from 'phosphor-react'
import Image from 'next/image'
import GiphyImagePicker from './GiphyImagePicker'
import ColorPicker from './ColorPicker'
import DropdownActions, { DropdownAction } from './DropdownActions'

interface TopicSuggestion {
  name: string
  description: string
  imageUrl?: string | null
  color?: string | null
  selected: boolean
  editing?: boolean
}

interface TopicCardProps {
  topic?: Topic
  suggestion?: TopicSuggestion
  onClick?: (topicId: number) => void
  onToggleSelection?: () => void
  onToggleEditing?: () => void
  onUpdate?: (updates: Partial<TopicSuggestion>) => void
  onEdit?: (topicId: number) => void
  onDelete?: (topicId: number) => void
  mode?: 'normal' | 'suggestion'
  hubName?: string
  hubDescription?: string
}

export default function TopicCard({ 
  topic, 
  suggestion, 
  onClick, 
  onToggleSelection,
  onToggleEditing,
  onUpdate,
  onEdit,
  onDelete,
  mode = 'normal',
  hubName,
  hubDescription
}: TopicCardProps) {
  const [editName, setEditName] = useState(suggestion?.name || '')
  const [editDescription, setEditDescription] = useState(suggestion?.description || '')

  const [currentQuery, setCurrentQuery] = useState<string>('')

  // Auto-generate optimal query when component mounts for suggestion mode
  useEffect(() => {
    if (mode === 'suggestion' && suggestion && hubName) {
      generateOptimalQuery(suggestion.name)
    }
  }, [mode, suggestion?.name, hubName])

  const generateOptimalQuery = async (topicName: string) => {
    if (!hubName || mode !== 'suggestion') {
      const fallback = topicName
      setCurrentQuery(fallback)
      return fallback
    }
    
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
          topicDescription: description,
          // Add more context for better search results  
          fullContext: `Hub: "${hubName}"${hubDescription ? ` (${hubDescription})` : ''}. Topic: "${topicName}" - ${description}. Generate optimal Giphy search terms.`
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentQuery(data.query)
        return data.query
      } else {
        const fallback = hubName ? `${topicName} ${hubName}` : topicName
        setCurrentQuery(fallback)
        return fallback
      }
    } catch (error) {
      const fallback = hubName ? `${topicName} ${hubName}` : topicName
      setCurrentQuery(fallback)
      return fallback
    }
  }

  // Use data from either topic or suggestion
  const data = mode === 'suggestion' ? suggestion : topic
  if (!data) return null

  const name = mode === 'suggestion' && suggestion ? suggestion.name : (topic ? topic.name : '')
  const description = mode === 'suggestion' && suggestion ? suggestion.description : (topic ? topic.description : undefined)
  const imageUrl = mode === 'suggestion' && suggestion ? suggestion.imageUrl : (topic ? topic.image_url : undefined)
  const color = mode === 'suggestion' && suggestion ? suggestion.color : (topic ? topic.color : undefined)
  const selected = mode === 'suggestion' && suggestion ? suggestion.selected : false
  const editing = mode === 'suggestion' && suggestion ? suggestion.editing : false

  // Create dropdown actions for normal mode
  const actions: DropdownAction[] = []
  
  if (mode === 'normal' && onEdit && topic) {
    actions.push({
      icon: <PencilSimple size={14} />,
      label: 'Edit',
      onClick: () => onEdit(topic.id),
      variant: 'default'
    })
  }
  
  if (mode === 'normal' && onDelete && topic) {
    actions.push({
      icon: <Trash size={14} />,
      label: 'Delete',
      onClick: () => onDelete(topic.id),
      variant: 'danger'
    })
  }

  const handleSaveEdit = () => {
    if (onUpdate) {
      onUpdate({
        name: editName.trim() || name,
        description: editDescription.trim() || description,
        editing: false
      })
    }
  }

  const handleCancelEdit = () => {
    setEditName(name)
    setEditDescription(description || '')
    if (onUpdate) {
      onUpdate({ editing: false })
    }
  }

  const handleToggleEditing = async () => {
    if (onToggleEditing) {
      onToggleEditing()
      // Auto-generate optimal query when entering edit mode
      if (!editing && mode === 'suggestion') {
        await generateOptimalQuery(name)
      }
    }
  }

  const handleMainClick = () => {
    if (mode === 'suggestion' && onToggleSelection) {
      onToggleSelection()
    } else if (mode === 'normal' && onClick && topic) {
      onClick(topic.id)
    }
  }

  const cardStyle = color ? {
    borderColor: color + '60',
    backgroundColor: color + '50'
  } : {}

  const containerStyle = mode === 'normal' ? {
    borderColor: color ? color + '40' : 'rgba(255, 255, 255, 0.1)',
    backgroundColor: color ? color + '10' : 'rgba(255, 255, 255, 0.1)',
    ...cardStyle
  } : {}

  const containerClasses = mode === 'normal' 
    ? "group relative rounded-lg p-6 border hover:border-opacity-80 transition-all duration-200 cursor-pointer"
    : `relative bg-gray-700 rounded-lg p-4 border-2 transition-all duration-200 cursor-pointer ${
        selected 
          ? 'border-hubcap-accent bg-opacity-20' 
          : 'border-gray-600 hover:border-gray-500'
      }`

  return (
    <div 
      className={containerClasses}
      style={containerStyle}
    >
      {/* Selection Checkbox - Only in suggestion mode */}
      {mode === 'suggestion' && onToggleSelection && (
        <button
          onClick={onToggleSelection}
          className={`absolute top-3 right-3 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
            selected
              ? 'bg-hubcap-accent border-hubcap-accent'
              : 'border-gray-400 hover:border-gray-300'
          }`}
        >
          {selected && <Check size={14} weight="bold" className="text-white" />}
        </button>
      )}

      {/* Dropdown Actions - Only in normal mode */}
      <DropdownActions actions={actions} />

      {/* Edit Button - Only in suggestion mode */}
      {mode === 'suggestion' && onToggleEditing && (
        <button
          onClick={handleToggleEditing}
          className="absolute top-3 right-12 w-6 h-6 text-gray-400 hover:text-white transition-colors"
        >
          <PencilSimple size={14} />
        </button>
      )}

      <div onClick={handleMainClick} className="cursor-pointer">
        {/* Use consistent layout for both modes */}
        <div className="flex flex-col items-center justify-center text-center gap-3 min-h-[120px]">
          {/* Topic Image - Consistent size for both modes */}
          <div className="w-20 h-20 flex-shrink-0 relative overflow-hidden rounded-lg bg-white/5">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={name}
                className="w-full h-full object-cover"
                style={{
                  border: `2px solid white`,
                  borderRadius: '8px'
                }}
                onError={() => {
                  console.log(`Image failed to load for ${name}:`, imageUrl)
                  if (onUpdate) {
                    onUpdate({ imageUrl: null })
                  }
                }}
              />
            ) : imageUrl === null ? (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-xs">📷</span>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {editing && mode === 'suggestion' ? (
            <div className="space-y-3 mt-4 w-full" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                maxLength={50}
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
                  query={currentQuery || editName || name}
                  selectedImageUrl={imageUrl || null}
                  onImageSelect={(imageUrl) => onUpdate && onUpdate({ imageUrl })}
                  showQuery={true}
                  onQueryGenerate={async () => {
                    const query = await generateOptimalQuery(editName || name)
                    return query
                  }}
                />
              </div>

              {/* Color Selection */}
              <div className="mt-3">
                <ColorPicker
                  selectedColor={color || null}
                  onColorSelect={(color) => onUpdate && onUpdate({ color })}
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
              <h2 className="text-xl font-semibold text-white">{name}</h2>
              {mode === 'suggestion' && description && (
                <p className="text-gray-300 text-sm leading-relaxed mt-1">{description}</p>
              )}
              {mode === 'normal' && topic?.subtopic_count !== undefined && topic.subtopic_count > 0 && (
                <p className="text-sm text-gray-400">
                  {topic.subtopic_count} {topic.subtopic_count === 1 ? 'subtopic' : 'subtopics'}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}