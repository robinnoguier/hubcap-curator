'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Hub } from '@/lib/supabase'
import HubCard from '@/components/HubCard'
import GiphyImagePicker from '@/components/GiphyImagePicker'
import ColorPicker from '@/components/ColorPicker'
import { useCache } from '@/lib/cache-context'

export default function Home() {
  const [hubs, setHubs] = useState<Hub[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateHub, setShowCreateHub] = useState(false)
  const [newHubName, setNewHubName] = useState('')
  const [newHubDescription, setNewHubDescription] = useState('')
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const cache = useCache()

  useEffect(() => {
    fetchHubs()
  }, [])

  const fetchHubs = async () => {
    const cachedHubs = cache.getHubs()
    
    if (cachedHubs) {
      setHubs(cachedHubs)
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/hubs')
      if (response.ok) {
        const hubsData = await response.json()
        setHubs(hubsData)
        cache.setHubs(hubsData)
      }
    } catch (error) {
      console.error('Error fetching hubs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateHub = async () => {
    if (!newHubName.trim()) return
    
    setCreating(true)
    try {
      const response = await fetch('/api/hubs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newHubName.trim(),
          description: newHubDescription.trim() || undefined,
          imageUrl: selectedImageUrl,
          color: selectedColor
        }),
      })
      
      if (response.ok) {
        const newHub = await response.json()
        const updatedHubs = [newHub, ...hubs]
        setHubs(updatedHubs)
        cache.invalidateCache('hubs')
        cache.setHubs(updatedHubs)
        setShowCreateHub(false)
        setNewHubName('')
        setNewHubDescription('')
        setSelectedImageUrl(null)
        setSelectedColor(null)
      }
    } catch (error) {
      console.error('Error creating hub:', error)
    } finally {
      setCreating(false)
    }
  }


  if (loading) {
    return (
      <main className="min-h-screen bg-hubcap-bg text-hubcap-text">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              <span className="text-hubcap-accent">Hubcap</span> Curator
            </h1>
            <p className="text-xl text-gray-300">
              Organize your content by topic hubs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700 animate-pulse">
                <div className="h-6 bg-gray-600 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-hubcap-bg text-hubcap-text">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="text-hubcap-accent">Hubcap</span> Curator
          </h1>
          <p className="text-xl text-gray-300">
            Organize your content by topic hubs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Create New Hub Card */}
          <div 
            className="bg-gray-800 rounded-lg p-6 border border-gray-600 border-dashed hover:border-hubcap-accent transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[160px]"
            onClick={() => setShowCreateHub(true)}
          >
            <div className="w-12 h-12 rounded-full bg-hubcap-accent bg-opacity-20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-hubcap-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-hubcap-accent">Create New Hub</h3>
          </div>

          {/* Existing Hubs */}
          {hubs.map((hub) => (
            <HubCard
              key={hub.id}
              hub={hub}
            />
          ))}
        </div>

        {hubs.length === 0 && (
          <div className="text-center mt-12 text-gray-400">
            <p className="text-lg mb-2">No hubs yet!</p>
            <p>Create your first hub to start organizing content by topics.</p>
          </div>
        )}
      </div>

      {/* Create Hub Modal */}
      {showCreateHub && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-hubcap-accent">Create New Hub</h2>
              <button
                onClick={() => {
                  setShowCreateHub(false)
                  setNewHubName('')
                  setNewHubDescription('')
                  setSelectedImageUrl(null)
                  setSelectedColor(null)
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hub Name *
                </label>
                <input
                  type="text"
                  value={newHubName}
                  onChange={(e) => setNewHubName(e.target.value)}
                  placeholder="e.g., Hyrox, Tech, Health"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:border-transparent text-white placeholder-gray-400"
                  maxLength={50}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newHubDescription}
                  onChange={(e) => setNewHubDescription(e.target.value)}
                  placeholder="Describe what this hub will contain..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:border-transparent text-white placeholder-gray-400 resize-none"
                  rows={3}
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Choose an Image
                </label>
                <GiphyImagePicker
                  query={newHubName}
                  selectedImageUrl={selectedImageUrl}
                  onImageSelect={setSelectedImageUrl}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Choose a Color
                </label>
                <ColorPicker
                  selectedColor={selectedColor}
                  onColorSelect={setSelectedColor}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateHub(false)
                  setNewHubName('')
                  setNewHubDescription('')
                  setSelectedImageUrl(null)
                  setSelectedColor(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateHub}
                disabled={!newHubName.trim() || creating}
                className="flex-1 px-4 py-2 bg-hubcap-accent hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors"
              >
                {creating ? 'Creating...' : 'Create Hub'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}