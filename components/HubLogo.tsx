'use client'

import { useState } from 'react'
import Image from 'next/image'

interface HubLogoProps {
  /** Hub name for fallback text */
  hubName: string
  /** Image URL to display inside the hexagon */
  imageUrl?: string | null
  /** Hub color for the hexagon fill */
  color?: string | null
  /** Size of the logo in pixels */
  size?: number
  /** Whether the image is currently loading */
  loading?: boolean
  /** Custom CSS classes */
  className?: string
  /** Show loading spinner */
  showLoading?: boolean
  /** Border width in pixels (default: 2px for normal, 1px for small) */
  borderWidth?: number
  /** Border color (default: white) */
  borderColor?: string
}

export default function HubLogo({ 
  hubName, 
  imageUrl, 
  color = '#FF0000', 
  size = 70, 
  loading = false,
  className = '',
  showLoading = true,
  borderWidth = size <= 20 ? 1 : 2,
  borderColor = '#ffffff'
}: HubLogoProps) {
  const [imageError, setImageError] = useState(false)
  
  // Calculate viewBox scaling - original is 70x78, but we need to account for border
  const aspectRatio = 78 / 70 // height / width
  const height = size * aspectRatio
  
  // Adjust viewBox to prevent border clipping - use more padding for thick borders
  const borderPadding = borderWidth * 3 // extra padding for thick borders
  const adjustedViewBoxWidth = 70 + borderPadding
  const adjustedViewBoxHeight = 78 + borderPadding
  const viewBoxOffset = borderPadding / 2
  
  const showFallback = !imageUrl || imageError
  const showLoadingSpinner = loading && showLoading && !imageUrl

  return (
    <div 
      className={`relative inline-block ${className}`}
      style={{ width: size, height }}
    >
      <svg 
        width={size} 
        height={height} 
        viewBox={`${-viewBoxOffset} ${-viewBoxOffset} ${adjustedViewBoxWidth} ${adjustedViewBoxHeight}`}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0"
      >
        <defs>
          <clipPath id={`hexagon-clip-${hubName.replace(/\s+/g, '-').toLowerCase()}`}>
            <path d="M31.5 1.02073C33.6658 -0.229704 36.3342 -0.229704 38.5 1.02073L66.141 16.9793C68.3068 18.2297 69.641 20.5406 69.641 23.0415V54.9585C69.641 57.4594 68.3068 59.7703 66.141 61.0207L38.5 76.9793C36.3342 78.2297 33.6658 78.2297 31.5 76.9793L3.85898 61.0207C1.69317 59.7703 0.358982 57.4594 0.358982 54.9585V23.0415C0.358982 20.5406 1.69317 18.2297 3.85898 16.9793L31.5 1.02073Z"/>
          </clipPath>
        </defs>
        
        {/* Hexagon with border - using double stroke technique for better visibility */}
        <path 
          d="M31.5 1.02073C33.6658 -0.229704 36.3342 -0.229704 38.5 1.02073L66.141 16.9793C68.3068 18.2297 69.641 20.5406 69.641 23.0415V54.9585C69.641 57.4594 68.3068 59.7703 66.141 61.0207L38.5 76.9793C36.3342 78.2297 33.6658 78.2297 31.5 76.9793L3.85898 61.0207C1.69317 59.7703 0.358982 57.4594 0.358982 54.9585V23.0415C0.358982 20.5406 1.69317 18.2297 3.85898 16.9793L31.5 1.02073Z" 
          fill={color || '#FF0000'}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={borderWidth + 1}
        />
        <path 
          d="M31.5 1.02073C33.6658 -0.229704 36.3342 -0.229704 38.5 1.02073L66.141 16.9793C68.3068 18.2297 69.641 20.5406 69.641 23.0415V54.9585C69.641 57.4594 68.3068 59.7703 66.141 61.0207L38.5 76.9793C36.3342 78.2297 33.6658 78.2297 31.5 76.9793L3.85898 61.0207C1.69317 59.7703 0.358982 57.4594 0.358982 54.9585V23.0415C0.358982 20.5406 1.69317 18.2297 3.85898 16.9793L31.5 1.02073Z" 
          fill="transparent"
          stroke={borderColor}
          strokeWidth={borderWidth}
        />
        
        {/* Image content */}
        {imageUrl && !imageError && (
          <foreignObject 
            x="0" 
            y="0" 
            width="70" 
            height="78"
            clipPath={`url(#hexagon-clip-${hubName.replace(/\s+/g, '-').toLowerCase()})`}
          >
            <Image
              src={imageUrl}
              alt={`${hubName} logo`}
              width={70}
              height={78}
              className="w-full h-full object-cover"
              unoptimized
              onError={() => setImageError(true)}
            />
          </foreignObject>
        )}
        
        {/* Loading spinner */}
        {showLoadingSpinner && (
          <foreignObject x="25" y="30" width="20" height="20">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white/70 rounded-full animate-spin"></div>
          </foreignObject>
        )}
        
        {/* Fallback letter */}
        {showFallback && !showLoadingSpinner && (
          <text
            x="35"
            y="47"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-white font-bold select-none"
            fontSize={size > 50 ? "24" : "16"}
            style={{ 
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {hubName.charAt(0).toUpperCase()}
          </text>
        )}
      </svg>
    </div>
  )
}