'use client'

import { Hub } from '@/lib/supabase'
import { generateSlug } from '@/lib/slug-utils'
import { useRouter } from 'next/navigation'
import { useHubImage } from '@/lib/hooks/useHubImage'
import Image from 'next/image'

interface HubCardProps {
  hub: Hub
  onClick?: (hubId: number) => void
}

export default function HubCard({ hub, onClick }: HubCardProps) {
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

  return (
    <div
      className="rounded-lg p-6 border hover:border-opacity-60 transition-all duration-200 cursor-pointer"
      style={{
        borderColor: hub.color ? hub.color + '40' : 'rgba(255, 255, 255, 0.1)',
        backgroundColor: hub.color ? hub.color + '10' : 'rgba(255, 255, 255, 0.1)',
        ...cardStyle
      }}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center justify-center text-center gap-3 min-h-[120px]">
        <div className="w-16 h-16 flex-shrink-0 relative overflow-hidden rounded-lg bg-white/5">
          {isLoadingImage && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white/70 rounded-full animate-spin"></div>
            </div>
          )}
          {!isLoadingImage && displayImageUrl && !error && (
            <Image
              src={displayImageUrl}
              alt={`${hub.name} icon`}
              width={64}
              height={64}
              className="w-full h-full object-cover"
              unoptimized
            />
          )}
          {!isLoadingImage && (!displayImageUrl || error) && (
            <div 
              className="w-full h-full flex items-center justify-center text-white font-semibold text-xl"
              style={{ 
                backgroundColor: hub.color || 'rgba(255, 255, 255, 0.1)',
                color: hub.color ? '#ffffff' : 'rgba(255, 255, 255, 0.5)'
              }}
            >
              {hub.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h2 className="text-xl font-semibold text-white">
          {hub.name}
        </h2>
      </div>
    </div>
  )
}