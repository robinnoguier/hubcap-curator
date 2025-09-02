'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'phosphor-react'

interface FloatingBackButtonProps {
  className?: string
}

export default function FloatingBackButton({ className = '' }: FloatingBackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    router.back()
  }

  return (
    <button
      onClick={handleBack}
      className={`fixed top-6 left-6 z-40 bg-surface-dark hover:bg-gray-700 border border-gray-600 rounded-full p-3 transition-colors shadow-lg ${className}`}
    >
      <ArrowLeft size={20} className="text-white" />
    </button>
  )
}