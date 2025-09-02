'use client'

import { useState } from 'react'
import { MagnifyingGlass } from 'phosphor-react'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSearch: (query: string, description: string) => void
  searching?: boolean
  entityName?: string // e.g., "topic", "subtopic"
}

export default function SearchModal({ 
  isOpen, 
  onClose, 
  onSearch, 
  searching = false,
  entityName = "content"
}: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchDescription, setSearchDescription] = useState('')

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    onSearch(searchQuery, searchDescription)
    // Clear the form
    setSearchQuery('')
    setSearchDescription('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-surface-dark rounded-lg p-6 w-full max-w-md border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Find New Links</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              What are you looking for? *
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  handleSearch()
                }
              }}
              placeholder="e.g., best practices, tutorials, examples"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:border-transparent text-white placeholder-gray-400"
              maxLength={100}
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Additional context (optional)
            </label>
            <textarea
              value={searchDescription}
              onChange={(e) => setSearchDescription(e.target.value)}
              placeholder="Any additional details or specific requirements..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:border-transparent text-white placeholder-gray-400 resize-none"
              rows={3}
              maxLength={200}
            />
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={!searchQuery.trim() || searching}
          className="w-full mt-6 px-4 py-2 bg-hubcap-accent hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {searching ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Searching...
            </>
          ) : (
            <>
              <MagnifyingGlass size={16} />
              Find Links
            </>
          )}
        </button>
      </div>
    </div>
  )
}