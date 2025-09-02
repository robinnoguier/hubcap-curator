'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PencilSimple, Trash } from 'phosphor-react'
import DropdownActions, { DropdownAction } from './DropdownActions'

interface SubtopicCardProps {
  id: number
  name: string
  imageUrl?: string | null
  color?: string | null
  hubSlug: string
  topicSlug: string
  onEdit?: () => void
  onDelete?: () => void
}

export default function SubtopicCard({ 
  id, 
  name, 
  imageUrl, 
  color,
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
      <Link href={`/${hubSlug}/${topicSlug}/${subtopicSlug}`}>
        <div 
          className="rounded-lg p-6 border hover:border-opacity-80 transition-all duration-200 cursor-pointer"
          style={containerStyle}
        >
          {/* Dropdown Actions */}
          <DropdownActions actions={actions} />

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
          </div>
        </div>
      </Link>
    </div>
  )
}