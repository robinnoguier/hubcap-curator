'use client'

import { useState } from 'react'
import { Hub } from '@/lib/supabase'
import { Trash, X } from 'phosphor-react'

interface DeleteHubModalProps {
  isOpen: boolean
  onClose: () => void
  onDelete: () => Promise<void>
  hub: Hub | null
}

export default function DeleteHubModal({ isOpen, onClose, onDelete, hub }: DeleteHubModalProps) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!hub) return
    
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch (error) {
      console.error('Error deleting hub:', error)
    } finally {
      setDeleting(false)
    }
  }

  const handleClose = () => {
    if (!deleting) {
      onClose()
    }
  }

  if (!isOpen || !hub) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-dark rounded-lg p-6 w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Trash size={20} className="text-red-400" />
            <h2 className="text-xl font-semibold text-red-400">Delete Hub</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
            disabled={deleting}
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-300 mb-3">
            Are you sure you want to delete <strong className="text-white">"{hub.name}"</strong>?
          </p>
          <p className="text-red-400 text-sm">
            This will permanently delete the hub and all of its topics, searches, and links. This action cannot be undone.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed rounded-md font-semibold transition-colors text-white"
          >
            {deleting ? 'Deleting...' : 'Delete Hub'}
          </button>
        </div>
      </div>
    </div>
  )
}