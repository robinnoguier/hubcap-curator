'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PencilSimple, Trash } from 'phosphor-react'
import DropdownActions, { DropdownAction } from './DropdownActions'

interface SubtopicCardProps {
  id: number
  name: string
  description?: string
  imageUrl?: string | null
  color?: string | null
  metadata?: Record<string, any>
  hubSlug: string
  topicSlug: string
  onEdit?: () => void
  onDelete?: () => void
}

export default function SubtopicCard({ 
  id, 
  name, 
  description,
  imageUrl, 
  color,
  metadata,
  hubSlug,
  topicSlug,
  onEdit,
  onDelete
}: SubtopicCardProps) {
  const [imageError, setImageError] = useState(false)
  const subtopicSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  // Create dropdown actions
  const actions: DropdownAction[] = []
  
  if (onEdit) {
    actions.push({
      icon: <PencilSimple size={14} />,
      label: 'Edit',
      onClick: onEdit,
      variant: 'default'
    })
  }
  
  if (onDelete) {
    actions.push({
      icon: <Trash size={14} />,
      label: 'Delete',
      onClick: onDelete,
      variant: 'danger'
    })
  }

  const containerStyle = {
    borderColor: color ? color + '40' : 'rgba(255, 255, 255, 0.1)',
    backgroundColor: color ? color + '10' : 'rgba(255, 255, 255, 0.1)',
  }

  return (
    <div className="group relative">
      {/* Dropdown Actions - outside Link to prevent navigation */}
      <DropdownActions actions={actions} />
      
      <Link href={`/${hubSlug}/${topicSlug}/${subtopicSlug}`}>
        <div 
          className="rounded-lg p-6 border hover:border-opacity-80 transition-all duration-200 cursor-pointer"
          style={containerStyle}
        >
          {/* Content matching TopicCard layout */}
          <div className="flex flex-col items-center justify-center text-center gap-3 min-h-[120px]">
            {/* Subtopic Image - Square like TopicCard */}
            <div className="w-20 h-20 flex-shrink-0 relative overflow-hidden rounded-lg bg-white/5">
              {imageUrl && !imageError ? (
                <img 
                  src={imageUrl} 
                  alt={name}
                  className="w-full h-full object-cover"
                  style={{
                    border: `2px solid white`,
                    borderRadius: '8px'
                  }}
                  onError={() => setImageError(true)}
                />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center text-white font-bold text-2xl"
                  style={{ 
                    backgroundColor: color || 'rgba(255, 255, 255, 0.1)',
                    border: `2px solid white`,
                    borderRadius: '8px'
                  }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Subtopic Name */}
            <h2 className="text-xl font-semibold text-white group-hover:text-hubcap-accent transition-colors">
              {name}
            </h2>
            
            {/* Description */}
            {description && (
              <p className="text-gray-300 text-sm text-center leading-relaxed mt-1">
                {description}
              </p>
            )}
            
            {/* Metadata Pills */}
            {metadata && Object.keys(metadata).length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center mt-2">
                {Object.entries(metadata).map(([key, value]) => {
                  if (value === null || value === undefined || value === '') return null;
                  
                  // Format the key to be more readable
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  
                  // Format the value
                  let displayValue = value;
                  if (typeof value === 'number') {
                    // Add units for common fields
                    if (key.includes('weight')) displayValue = `${value}kg`;
                    else if (key.includes('height')) displayValue = `${value}cm`;
                    else if (key.includes('age')) displayValue = `${value}y`;
                    else displayValue = String(value);
                  } else if (typeof value === 'boolean') {
                    displayValue = value ? 'Yes' : 'No';
                  } else {
                    displayValue = String(value);
                  }
                  
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-200 border border-gray-600"
                    >
                      <span className="text-gray-400 mr-1">{label}:</span>
                      <span className="text-white">{displayValue}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}