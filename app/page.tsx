'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { generateSlug } from '@/lib/slug-utils'
import { Hub } from '@/lib/supabase'
import HubCard from '@/components/HubCard'
import Logo from '@/components/Logo'
import CreateHubModal from '@/components/CreateHubModal'
import TopicSelectionModal from '@/components/TopicSelectionModal'
import DeleteHubModal from '@/components/DeleteHubModal'
import { useCache } from '@/lib/cache-context'
import { Plus } from 'phosphor-react'

export default function Home() {
  const [hubs, setHubs] = useState<Hub[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateHub, setShowCreateHub] = useState(false)
  const [showEditHub, setShowEditHub] = useState(false)
  const [showDeleteHub, setShowDeleteHub] = useState(false)
  const [showTopicSelection, setShowTopicSelection] = useState(false)
  const [selectedHub, setSelectedHub] = useState<Hub | null>(null)
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

  const handleCreateHub = async (hubData: { name: string; description?: string; imageUrl?: string | null; color?: string | null; memberNicknamePlural?: string | null; fakeOnlineCount?: number | null }) => {
    const response = await fetch('/api/hubs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(hubData),
    })
    
    if (response.ok) {
      const newHub = await response.json()
      const updatedHubs = [newHub, ...hubs]
      setHubs(updatedHubs)
      cache.invalidateCache('hubs')
      cache.setHubs(updatedHubs)
      return newHub // Return the created hub for the callback
    }
    
    throw new Error('Failed to create hub')
  }

  const handleEditHub = async (hubData: { name: string; description?: string; imageUrl?: string | null; color?: string | null; memberNicknamePlural?: string | null; fakeOnlineCount?: number | null }) => {
    if (!selectedHub) return
    
    const response = await fetch(`/api/hubs/${selectedHub.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(hubData),
    })
    
    if (response.ok) {
      const updatedHub = await response.json()
      const updatedHubs = hubs.map(hub => hub.id === selectedHub.id ? updatedHub : hub)
      setHubs(updatedHubs)
      cache.invalidateCache('hubs')
      cache.setHubs(updatedHubs)
      setShowEditHub(false)
      setSelectedHub(null)
    } else {
      throw new Error('Failed to update hub')
    }
  }

  const handleDeleteHub = async () => {
    if (!selectedHub) return
    
    const response = await fetch(`/api/hubs/${selectedHub.id}`, {
      method: 'DELETE',
    })
    
    if (response.ok) {
      const updatedHubs = hubs.filter(hub => hub.id !== selectedHub.id)
      setHubs(updatedHubs)
      cache.invalidateCache('hubs')
      cache.setHubs(updatedHubs)
      setShowDeleteHub(false)
      setSelectedHub(null)
    } else {
      throw new Error('Failed to delete hub')
    }
  }

  const handleHubEdit = (hubId: number) => {
    const hub = hubs.find(h => h.id === hubId)
    if (hub) {
      setSelectedHub(hub)
      setShowEditHub(true)
    }
  }

  const handleHubDelete = (hubId: number) => {
    const hub = hubs.find(h => h.id === hubId)
    if (hub) {
      setSelectedHub(hub)
      setShowDeleteHub(true)
    }
  }


  if (loading) {
    return (
      <main className="min-h-screen bg-hubcap-bg text-hubcap-text">
        <div className="container mx-auto px-4 py-16 max-w-7xl">
          <div className="text-center mb-16">
            <Logo />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="white-10 rounded-lg p-6 border border-gray-700 animate-pulse">
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
        <div className="text-center mb-20">
          <Logo />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Create New Hub Card */}
          <div 
            className="bg-surface-dark rounded-lg p-6 border border-gray-600 border-dashed hover:border-hubcap-accent transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[160px]"
            onClick={() => setShowCreateHub(true)}
          >
            <div className="w-12 h-12 rounded-full bg-hubcap-accent bg-opacity-20 flex items-center justify-center mb-4">
              <Plus size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-">Create New Hub</h3>
          </div>

          {/* Existing Hubs */}
          {hubs.map((hub) => (
            <HubCard
              key={hub.id}
              hub={hub}
              onEdit={handleHubEdit}
              onDelete={handleHubDelete}
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

      <CreateHubModal
        isOpen={showCreateHub}
        onClose={() => setShowCreateHub(false)}
        onCreate={handleCreateHub}
        onHubCreated={(hub) => {
          setSelectedHub(hub)
          setShowCreateHub(false)
          setShowTopicSelection(true)
        }}
      />

      <CreateHubModal
        isOpen={showEditHub}
        onClose={() => {
          setShowEditHub(false)
          setSelectedHub(null)
        }}
        onCreate={handleEditHub}
        isEditMode={true}
        initialData={selectedHub ? {
          name: selectedHub.name,
          description: selectedHub.description,
          imageUrl: selectedHub.image_url,
          color: selectedHub.color,
          memberNicknamePlural: selectedHub.member_nickname_plural,
          fakeOnlineCount: selectedHub.fake_online_count
        } : undefined}
      />

      <DeleteHubModal
        isOpen={showDeleteHub}
        onClose={() => {
          setShowDeleteHub(false)
          setSelectedHub(null)
        }}
        onDelete={handleDeleteHub}
        hub={selectedHub}
      />
      
      <TopicSelectionModal
        isOpen={showTopicSelection}
        onClose={() => {
          setShowTopicSelection(false)
          setSelectedHub(null)
        }}
        hubId={selectedHub?.id || 0}
        hubName={selectedHub?.name || ''}
        hubDescription={selectedHub?.description}
        onComplete={async () => {
          // Refresh hubs to show updated data
          await fetchHubs()
        }}
        onNavigateToHub={() => {
          if (selectedHub) {
            const hubSlug = generateSlug(selectedHub.name)
            router.push(`/${hubSlug}`)
          }
        }}
      />
    </main>
  )
}