'use client'

import { useState, useEffect, useRef } from 'react'
import { DotsThreeOutline } from 'phosphor-react'

export interface DropdownAction {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
}

interface DropdownActionsProps {
  actions: DropdownAction[]
  className?: string
}

export default function DropdownActions({ actions, className = '' }: DropdownActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (actions.length === 0) return null

  return (
    <div className={`absolute top-3 right-3 ${className}`} ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="w-6 h-6 text-white opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
      >
        <DotsThreeOutline size={16} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-8 bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-1 z-[9999] min-w-[120px]">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                action.onClick()
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 text-left hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                action.variant === 'danger' 
                  ? 'text-red-400 hover:text-red-300' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}