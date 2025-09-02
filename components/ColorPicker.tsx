'use client'

import { Check } from 'phosphor-react'

interface ColorPickerProps {
  selectedColor: string | null
  onColorSelect: (color: string) => void
}

const PASTEL_COLORS = [
  { name: 'Pastel Red', value: '#FF6B6B' },
  { name: 'Pastel Orange', value: '#FF9F68' },
  { name: 'Pastel Yellow', value: '#FFD66B' },
  { name: 'Pastel Green', value: '#6BCB77' },
  { name: 'Pastel Teal', value: '#4ECDC4' },
  { name: 'Pastel Blue', value: '#6A9EFF' },
  { name: 'Pastel Purple', value: '#A38BFF' },
  { name: 'Pastel Pink', value: '#FF8CCF' },
]

export default function ColorPicker({ selectedColor, onColorSelect }: ColorPickerProps) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-3">
        {PASTEL_COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => onColorSelect(color.value)}
            className={`relative w-12 h-12 rounded-lg transition-all duration-200 ${
              selectedColor === color.value
                ? 'ring-2 ring-white ring-opacity-50 scale-110'
                : 'hover:scale-105'
            }`}
            style={{ backgroundColor: color.value }}
            title={color.name}
          >
            {selectedColor === color.value && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Check size={20} weight="bold" className="text-white drop-shadow-lg" />
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="mt-3 text-center">
      </div>
    </div>
  )
}