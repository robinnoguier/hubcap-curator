'use client'

import { useState } from 'react'
import { MagnifyingGlass, X } from 'phosphor-react'

interface FindNewLinksModalProps {
  isOpen: boolean
  onClose: () => void
  onSearch: (additionalContext?: string) => void
  searching?: boolean
  entityType: 'topic' | 'subtopic'
  entityName: string
  hubName: string
  topicName?: string // Required for subtopics
}

export default function FindNewLinksModal({ 
  isOpen, 
  onClose, 
  onSearch, 
  searching = false,
  entityType,
  entityName,
  hubName,
  topicName
}: FindNewLinksModalProps) {
  const [additionalContext, setAdditionalContext] = useState('')
  const [showContextInput, setShowContextInput] = useState(true)

  const handleSearch = () => {
    // Call onSearch with optional additional context
    onSearch(additionalContext.trim() || undefined)
    // Clear the form
    setAdditionalContext('')
    setShowContextInput(false)
    onClose()
  }

  if (!isOpen) return null

  const contextDescription = entityType === 'subtopic' 
    ? `${hubName} > ${topicName} > ${entityName}`
    : `${hubName} > ${entityName}`

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !searching) {
          onClose()
        }
      }}
    >
      <div className="bg-surface-dark rounded-lg p-6 w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Find New Links</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={searching}
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Context Info */}
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
            <p className="text-xs text-gray-400 mb-1">Searching for links in:</p>
            <p className="text-sm text-white font-medium">{contextDescription}</p>
          </div>

          {/* Optional Additional Context */}
          {!showContextInput ? (
            <button
              onClick={() => setShowContextInput(true)}
              className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors"
            >
              + Add additional context (optional)
            </button>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Additional context (optional)
              </label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !searching) {
                    e.preventDefault()
                    handleSearch()
                  }
                }}
                placeholder="Any specific angle, requirements, or focus areas..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:border-transparent text-white placeholder-gray-400 resize-none"
                rows={3}
                maxLength={200}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">
                {additionalContext.length}/200 characters
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={searching}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="flex-1 px-4 py-2 bg-hubcap-accent hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {searching ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Searching...</span>
              </>
            ) : (
              <>
                <MagnifyingGlass size={20} />
                <span>Find Links</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}