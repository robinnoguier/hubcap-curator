'use client'

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
                <svg className="w-5 h-5 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="mt-3 text-center">
        <p className="text-xs text-gray-400">
          {selectedColor ? 
            PASTEL_COLORS.find(c => c.value === selectedColor)?.name || selectedColor :
            'Select a color for your hub'
          }
        </p>
      </div>
    </div>
  )
}