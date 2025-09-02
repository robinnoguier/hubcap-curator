'use client'

import { Hub } from '@/lib/supabase'
import { generateSlug } from '@/lib/slug-utils'
import { useRouter } from 'next/navigation'
import { useHubImage } from '@/lib/hooks/useHubImage'
import { PencilSimple, Trash } from 'phosphor-react'
import DropdownActions, { DropdownAction } from './DropdownActions'
import HubLogo from './HubLogo'

interface HubCardProps {
  hub: Hub
  onClick?: (hubId: number) => void
  onEdit?: (hubId: number) => void
  onDelete?: (hubId: number) => void
}

export default function HubCard({ hub, onClick, onEdit, onDelete }: HubCardProps) {
  const router = useRouter()
  
  // Only fetch from Giphy if no image_url is stored
  const { imageUrl: giphyImageUrl, loading, error } = useHubImage(hub.image_url ? '' : hub.name)
  
  // Prioritize stored image_url over Giphy search
  const displayImageUrl = hub.image_url || giphyImageUrl

  const handleClick = () => {
    if (onClick) {
      onClick(hub.id)
    } else {
      const hubSlug = generateSlug(hub.name)
      router.push(`/${hubSlug}`)
    }
  }

  const cardStyle = hub.color ? {
    borderColor: hub.color + '60', // 25% opacity
    backgroundColor: hub.color + '50' // 6% opacity
  } : {}

  const isLoadingImage = !hub.image_url && loading

  // Create dropdown actions
  const actions: DropdownAction[] = []
  
  if (onEdit) {
    actions.push({
      icon: <PencilSimple size={14} />,
      label: 'Edit',
      onClick: () => onEdit(hub.id),
      variant: 'default'
    })
  }
  
  if (onDelete) {
    actions.push({
      icon: <Trash size={14} />,
      label: 'Delete',
      onClick: () => onDelete(hub.id),
      variant: 'danger'
    })
  }

  return (
    <div
      className="group relative rounded-lg p-6 border hover:border-opacity-80 transition-all duration-200 cursor-pointer"
      style={{
        borderColor: hub.color ? hub.color + '40' : 'rgba(255, 255, 255, 0.1)',
        backgroundColor: hub.color ? hub.color + '10' : 'rgba(255, 255, 255, 0.1)',
        ...cardStyle
      }}
      onClick={handleClick}
    >
      {/* Dropdown Actions */}
      <DropdownActions actions={actions} />
      <div className="flex flex-col items-center justify-center text-center gap-3 min-h-[120px]">
        <HubLogo
          hubName={hub.name}
          imageUrl={displayImageUrl}
          color={hub.color}
          size={80}
          loading={isLoadingImage}
          showLoading={!hub.image_url}
          borderWidth={6}
        />
        <h2 className="text-xl font-semibold text-white">
          {hub.name}
        </h2>
        {hub.topic_count !== undefined && hub.topic_count > 0 && (
          <p className="text-sm text-gray-400">
            {hub.topic_count} {hub.topic_count === 1 ? 'topic' : 'topics'}
          </p>
        )}
      </div>
    </div>
  )
}