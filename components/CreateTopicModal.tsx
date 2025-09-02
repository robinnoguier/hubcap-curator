'use client'

import { useState, useEffect } from 'react'
import GiphyImagePicker from './GiphyImagePicker'
import ColorPicker from './ColorPicker'

interface CreateTopicModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (topicData: {
    name: string
    description?: string
    imageUrl?: string | null
    color?: string | null
  }) => Promise<void>
  isEditMode?: boolean
  initialData?: {
    name: string
    description?: string
    imageUrl?: string | null
    color?: string | null
  }
}

export default function CreateTopicModal({ isOpen, onClose, onCreate, isEditMode = false, initialData }: CreateTopicModalProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(initialData?.imageUrl || null)
  const [selectedColor, setSelectedColor] = useState<string | null>(initialData?.color || null)
  const [creating, setCreating] = useState(false)

  // Update state when initialData changes or modal opens
  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name || '')
      setDescription(initialData.description || '')
      setSelectedImageUrl(initialData.imageUrl || null)
      setSelectedColor(initialData.color || null)
    }
  }, [isOpen, initialData])

  const handleClose = () => {
    if (!isEditMode) {
      setName('')
      setDescription('')
      setSelectedImageUrl(null)
      setSelectedColor(null)
    }
    onClose()
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    
    setCreating(true)
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        imageUrl: selectedImageUrl,
        color: selectedColor
      })
      handleClose()
    } catch (error) {
      console.error('Error creating topic:', error)
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-dark rounded-lg p-6 w-full max-w-lg border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">{isEditMode ? 'Edit Topic' : 'Create New Topic'}</h2>
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
              Topic Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Nutrition, Training, Recovery"
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
              placeholder="Describe what this topic will cover..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:border-transparent text-white placeholder-gray-400 resize-none"
              rows={3}
              maxLength={200}
            />
          </div>

          <div>
            <GiphyImagePicker
              query={name}
              selectedImageUrl={selectedImageUrl}
              onImageSelect={setSelectedImageUrl}
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
            {creating ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Topic' : 'Create Topic')}
          </button>
        </div>
      </div>
    </div>
  )
}