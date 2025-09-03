'use client'

import { useState, useEffect } from 'react'
import { X, Check, Database } from 'phosphor-react'

interface SubtopicWithMetadata {
  name: string
  description: string
  normalized_name: string
  metadata: Record<string, any>
  selected: boolean
  imageUrl?: string | null
  color?: string | null
}

interface MetadataField {
  id: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'date'
  description: string
  example: any
  selected: boolean
}

interface MetadataSuggestionModalProps {
  isOpen: boolean
  onClose: () => void
  selectedSubtopics: SubtopicWithMetadata[]
  hubName: string
  hubDescription?: string
  topicName: string
  topicDescription?: string
  onApplyMetadata: (subtopics: SubtopicWithMetadata[], selectedFields: string[]) => void
}

export default function MetadataSuggestionModal({
  isOpen,
  onClose,
  selectedSubtopics,
  hubName,
  hubDescription,
  topicName,
  topicDescription,
  onApplyMetadata
}: MetadataSuggestionModalProps) {
  const [detectedType, setDetectedType] = useState<string>('')
  const [availableFields, setAvailableFields] = useState<MetadataField[]>([])
  const [previewSubtopics, setPreviewSubtopics] = useState<SubtopicWithMetadata[]>([])
  const [loading, setLoading] = useState(false)
  const [generatingPreview, setGeneratingPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Auto-detect type and load fields when modal opens
  useEffect(() => {
    if (isOpen && selectedSubtopics.length > 0) {
      detectTypeAndLoadFields()
    }
  }, [isOpen, selectedSubtopics])

  const detectTypeAndLoadFields = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/subtopics/suggestions-with-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hub: { name: hubName, description: hubDescription },
          topic: { name: topicName, description: topicDescription },
          candidate_subtopics: selectedSubtopics.map(s => s.name),
          context_examples: [],
          locale: { region: 'US', language: 'en' }
        }),
      })

      if (response.ok) {
        const result = await response.json()
        
        // Set detected type for display
        const typeLabels = {
          person: 'People',
          event: 'Events', 
          product: 'Products',
          organization: 'Organizations',
          location: 'Locations',
          media: 'Media',
          animal: 'Animals',
          information: 'Information',
          other: 'Items'
        }
        setDetectedType(typeLabels[result.inferred_type as keyof typeof typeLabels] || 'Items')
        
        // Convert schema to selectable fields (pre-select useful ones)
        const fields: MetadataField[] = result.schema.fields.map((field: any) => ({
          id: field.id,
          label: field.label,
          type: field.type,
          description: field.description,
          example: field.example,
          selected: !['id', 'created_at', 'updated_at'].includes(field.id) // Pre-select most fields except system ones
        }))
        
        setAvailableFields(fields)
      } else {
        throw new Error('Failed to detect metadata type')
      }
    } catch (error) {
      console.error('Error detecting type:', error)
      setError('Failed to detect metadata fields')
    } finally {
      setLoading(false)
    }
  }

  const toggleField = (fieldId: string) => {
    setAvailableFields(prev =>
      prev.map(field =>
        field.id === fieldId ? { ...field, selected: !field.selected } : field
      )
    )
  }

  const generatePreview = async () => {
    const selectedFields = availableFields.filter(f => f.selected)
    if (selectedFields.length === 0) return

    setGeneratingPreview(true)
    setError(null)
    
    try {
      const response = await fetch('/api/subtopics/suggestions-with-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hub: { name: hubName, description: hubDescription },
          topic: { name: topicName, description: topicDescription },
          candidate_subtopics: selectedSubtopics.map(s => s.name),
          context_examples: [],
          locale: { region: 'US', language: 'en' }
        }),
      })

      if (response.ok) {
        const result = await response.json()
        
        // Merge generated metadata with existing subtopic data
        const enhancedSubtopics = selectedSubtopics.map(subtopic => {
          const generatedSubtopic = result.subtopics.find((gs: any) => gs.name === subtopic.name)
          
          // Filter metadata to only include selected fields
          const filteredMetadata: Record<string, any> = {}
          selectedFields.forEach(field => {
            if (generatedSubtopic?.metadata[field.id] !== undefined) {
              filteredMetadata[field.id] = generatedSubtopic.metadata[field.id]
            }
          })
          
          return {
            ...subtopic,
            normalized_name: generatedSubtopic?.normalized_name || subtopic.name.toLowerCase().replace(/\s+/g, '_'),
            metadata: filteredMetadata
          }
        })
        
        setPreviewSubtopics(enhancedSubtopics)
        setShowPreview(true)
      } else {
        throw new Error('Failed to generate metadata')
      }
    } catch (error) {
      console.error('Error generating preview:', error)
      setError('Failed to generate metadata preview')
    } finally {
      setGeneratingPreview(false)
    }
  }

  const handleApply = () => {
    const selectedFieldIds = availableFields.filter(f => f.selected).map(f => f.id)
    onApplyMetadata(previewSubtopics, selectedFieldIds)
    handleClose()
  }

  const handleClose = () => {
    setDetectedType('')
    setAvailableFields([])
    setPreviewSubtopics([])
    setLoading(false)
    setGeneratingPreview(false)
    setError(null)
    setShowPreview(false)
    onClose()
  }

  const selectedFieldCount = availableFields.filter(f => f.selected).length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-dark rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-700">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <Database size={24} />
              Add Metadata
            </h2>
            <p className="text-gray-400 mt-1">
              {detectedType && `Detected: ${detectedType} • `}
              Add structured data to {selectedSubtopics.length} subtopic{selectedSubtopics.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
            disabled={loading || generatingPreview}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-600/30 rounded-md">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-hubcap-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-300">Detecting metadata fields...</p>
            </div>
          ) : !showPreview ? (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Choose Metadata Fields</h3>
                <p className="text-gray-400 text-sm">
                  Select which data fields to add to your subtopics. These will be automatically populated.
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {availableFields.map((field) => (
                  <div
                    key={field.id}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      field.selected
                        ? 'border-hubcap-accent bg-hubcap-accent/5'
                        : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                    }`}
                    onClick={() => toggleField(field.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                              field.selected
                                ? 'bg-hubcap-accent border-hubcap-accent'
                                : 'border-gray-400'
                            }`}
                          >
                            {field.selected && (
                              <Check size={14} weight="bold" className="text-white" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-white flex items-center gap-2">
                              {field.label}
                              <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                                {field.type}
                              </span>
                            </h4>
                          </div>
                        </div>
                        <p className="text-gray-400 text-sm mb-1">{field.description}</p>
                        <p className="text-gray-500 text-xs">
                          Example: <code>{JSON.stringify(field.example)}</code>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedFieldCount > 0 && (
                <div className="text-center">
                  <button
                    onClick={generatePreview}
                    disabled={generatingPreview}
                    className="px-6 py-3 bg-hubcap-accent hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors"
                  >
                    {generatingPreview ? 'Generating...' : `Generate ${selectedFieldCount} Field${selectedFieldCount !== 1 ? 's' : ''}`}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Preview Generated Metadata</h3>
                <p className="text-gray-400 text-sm">
                  Review the generated data. This will be added to your subtopics.
                </p>
              </div>

              <div className="space-y-4">
                {previewSubtopics.map((subtopic, index) => (
                  <div key={index} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                      {subtopic.imageUrl && (
                        <img 
                          src={subtopic.imageUrl} 
                          alt={subtopic.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      {subtopic.name}
                    </h4>
                    
                    {Object.keys(subtopic.metadata).length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(subtopic.metadata).map(([key, value]) => {
                          const field = availableFields.find(f => f.id === key)
                          return (
                            <div key={key} className="bg-gray-800/50 p-3 rounded border">
                              <div className="text-xs text-gray-400 mb-1">{field?.label || key}</div>
                              <div className="text-sm text-white font-medium">
                                {value !== null && value !== undefined ? 
                                  (typeof value === 'object' ? JSON.stringify(value) : String(value)) 
                                  : '—'
                                }
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm italic">No metadata generated for this subtopic</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-800">
          <div className="flex justify-between items-center">
            <div>
              {showPreview && (
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                  disabled={loading || generatingPreview}
                >
                  Back to Fields
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                disabled={loading || generatingPreview}
              >
                {showPreview ? 'Skip Metadata' : 'Cancel'}
              </button>
              {showPreview ? (
                <button
                  onClick={handleApply}
                  disabled={loading || generatingPreview}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors"
                >
                  Apply Metadata
                </button>
              ) : (
                <button
                  onClick={() => onApplyMetadata(selectedSubtopics, [])}
                  disabled={loading}
                  className="px-6 py-2 bg-hubcap-accent hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors"
                >
                  Skip Metadata
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}