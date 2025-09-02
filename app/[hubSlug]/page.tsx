'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Hub, Topic } from '@/lib/supabase'
import { generateSlug } from '@/lib/slug-utils'
import TopicCard from '@/components/TopicCard'
import Breadcrumbs from '@/components/Breadcrumbs'
import CreateTopicModal from '@/components/CreateTopicModal'
import CreateHubModal from '@/components/CreateHubModal'
import DeleteHubModal from '@/components/DeleteHubModal'
import { useHubImage } from '@/lib/hooks/useHubImage'
import { useCache } from '@/lib/cache-context'
import HubLogo from '@/components/HubLogo'
import { PencilSimple, Trash, Plus, ArrowLeft } from 'phosphor-react'

export default function HubDetailBySlug() {
  const [hub, setHub] = useState<Hub | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateTopic, setShowCreateTopic] = useState(false)
  const [showEditTopic, setShowEditTopic] = useState(false)
  const [showDeleteTopic, setShowDeleteTopic] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [showEditHub, setShowEditHub] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const router = useRouter()
  const params = useParams()
  const hubSlug = params.hubSlug as string
  const cache = useCache()
  
  // Get hub image (only search if no stored image)
  const { imageUrl: giphyImageUrl, loading: imageLoading } = useHubImage(
    hub && !hub.image_url ? hub.name : ''
  )
  const displayImageUrl = hub?.image_url || giphyImageUrl

  useEffect(() => {
    if (hubSlug) {
      fetchHubBySlug()
    }
  }, [hubSlug])

  const fetchHubBySlug = async () => {
    try {
      // First try to get hubs from cache
      let hubs = cache.getHubs()
      
      if (!hubs) {
        // If not cached, fetch from API
        const response = await fetch('/api/hubs')
        if (response.ok) {
          hubs = await response.json()
          if (hubs) {
            cache.setHubs(hubs)
          }
        } else {
          router.push('/')
          return
        }
      }
      
      const matchingHub = hubs?.find((h: Hub) => generateSlug(h.name) === hubSlug)
      
      if (matchingHub) {
        // Check cache for hub with topics
        const cachedHubWithTopics = cache.getHubWithTopics(matchingHub.id)
        
        if (cachedHubWithTopics) {
          setHub(cachedHubWithTopics.hub)
          setTopics(cachedHubWithTopics.topics)
          setLoading(false)
          return
        }
        
        // If not cached, fetch from API
        const hubResponse = await fetch(`/api/hubs/${matchingHub.id}`)
        if (hubResponse.ok) {
          const data = await hubResponse.json()
          setHub(data.hub)
          setTopics(data.topics)
          cache.setHubWithTopics(matchingHub.id, { hub: data.hub, topics: data.topics })
        } else {
          router.push('/')
        }
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Error fetching hub by slug:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTopic = async (topicData: { name: string; description?: string; imageUrl?: string | null; color?: string | null }) => {
    if (!hub) return
    
    const response = await fetch('/api/topics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hubId: hub.id,
        name: topicData.name,
        description: topicData.description,
        imageUrl: topicData.imageUrl,
        color: topicData.color
      }),
    })
    
    if (response.ok) {
      const newTopic = await response.json()
      const updatedTopics = [newTopic, ...topics]
      setTopics(updatedTopics)
      cache.invalidateCache('hubTopics', hub.id)
      cache.setHubWithTopics(hub.id, { hub, topics: updatedTopics })
    }
  }

  const handleTopicClick = (topicId: number) => {
    const topic = topics.find(t => t.id === topicId)
    if (topic) {
      const topicSlug = generateSlug(topic.name)
      router.push(`/${hubSlug}/${topicSlug}`)
    }
  }

  const handleEditClick = () => {
    setShowEditHub(true)
  }

  const handleUpdateHub = async (hubData: { name: string; description?: string; imageUrl?: string | null; color?: string | null; memberNicknamePlural?: string | null; fakeOnlineCount?: number | null }) => {
    if (!hub) return
    
    try {
      const response = await fetch(`/api/hubs/${hub.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: hubData.name,
          description: hubData.description,
          imageUrl: hubData.imageUrl,
          color: hubData.color,
          memberNicknamePlural: hubData.memberNicknamePlural,
          fakeOnlineCount: hubData.fakeOnlineCount
        }),
      })
      
      if (response.ok) {
        const updatedHub = await response.json()
        setHub(updatedHub)
        cache.invalidateCache('hubs')
        cache.invalidateCache('hubTopics', hub.id)
        setShowEditHub(false)
        
        // If hub name changed, redirect to new slug
        if (updatedHub.name !== hub.name) {
          const newSlug = generateSlug(updatedHub.name)
          router.push(`/${newSlug}`)
        }
      }
    } catch (error) {
      console.error('Error updating hub:', error)
      throw error
    }
  }

  const handleDeleteHub = async () => {
    if (!hub) return
    
    const response = await fetch(`/api/hubs/${hub.id}`, {
      method: 'DELETE'
    })
    
    if (response.ok) {
      cache.invalidateCache('hubs')
      cache.invalidateCache('hubTopics', hub.id)
      router.push('/')
    }
  }

  const handleTopicEdit = (topicId: number) => {
    const topic = topics.find(t => t.id === topicId)
    if (topic) {
      setSelectedTopic(topic)
      setShowEditTopic(true)
    }
  }

  const handleTopicDelete = (topicId: number) => {
    const topic = topics.find(t => t.id === topicId)
    if (topic) {
      setSelectedTopic(topic)
      setShowDeleteTopic(true)
    }
  }

  const handleEditTopic = async (topicData: { name: string; description?: string; imageUrl?: string | null; color?: string | null }) => {
    if (!selectedTopic || !hub) return
    
    try {
      const response = await fetch(`/api/topics/${selectedTopic.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: topicData.name,
          description: topicData.description,
          imageUrl: topicData.imageUrl,
          color: topicData.color
        }),
      })
      
      if (response.ok) {
        const updatedTopic = await response.json()
        const updatedTopics = topics.map(topic => 
          topic.id === selectedTopic.id ? updatedTopic : topic
        )
        setTopics(updatedTopics)
        cache.invalidateCache('hubTopics', hub.id)
        cache.setHubWithTopics(hub.id, { hub, topics: updatedTopics })
        setShowEditTopic(false)
        setSelectedTopic(null)
      }
    } catch (error) {
      console.error('Error updating topic:', error)
      throw error
    }
  }

  const handleDeleteTopic = async () => {
    if (!selectedTopic || !hub) return
    
    try {
      const response = await fetch(`/api/topics/${selectedTopic.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        const updatedTopics = topics.filter(topic => topic.id !== selectedTopic.id)
        setTopics(updatedTopics)
        cache.invalidateCache('hubTopics', hub.id)
        cache.setHubWithTopics(hub.id, { hub, topics: updatedTopics })
        setShowDeleteTopic(false)
        setSelectedTopic(null)
      }
    } catch (error) {
      console.error('Error deleting topic:', error)
      throw error
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-hubcap-bg text-hubcap-text">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-600 rounded w-1/4 mb-4"></div>
            <div className="h-6 bg-gray-700 rounded w-1/2 mb-8"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="white-10 rounded-lg p-6 border border-gray-700">
                  <div className="h-6 bg-gray-600 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!hub) {
    return (
      <main className="min-h-screen bg-hubcap-bg text-hubcap-text flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Hub Not Found</h1>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-hubcap-accent rounded-md hover:bg-opacity-80 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </main>
    )
  }

  return (
    <main 
      className="min-h-screen text-hubcap-text relative"
      style={{
        backgroundColor: '#121212', // Base black background
      }}
    >
      {/* Color Overlay */}
      {hub.color && (
        <div 
          className="absolute h-1 inset-0 pointer-events-none"
          style={{
            backgroundColor: hub.color,
            opacity: 1
          }}
        />
      )}
      
      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        {/* Header */}
        <div className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <button
                onClick={() => router.push('/')}
                className="bg-surface-dark hover:bg-gray-700 border border-gray-600 rounded-full p-2.5 transition-colors shadow-lg flex-shrink-0 flex items-center justify-center"
              >
                <ArrowLeft size={20} className="text-white" />
              </button>
              
              <div className="flex items-center mt-4">
                <Breadcrumbs items={[
                  { label: 'Hubs', href: '/', isHome: true },
                  { label: hub.name, active: true, imageUrl: hub.image_url, hubColor: hub.color, isHub: true }
                ]} />
              </div>
            </div>
            
            {/* Edit and Delete Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleEditClick}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors flex items-center gap-2"
              >
                <PencilSimple size={16} />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center gap-2"
              >
                <Trash size={16} />
                Delete
              </button>
            </div>
          </div>
          
          {/* Large Centered Hub Display */}
          <div className="text-center mb-32">
            <div className="flex justify-center mb-6">
                <HubLogo
                  hubName={hub.name}
                  imageUrl={displayImageUrl}
                  color={hub.color}
                  size={128}
                  loading={imageLoading}
                  showLoading={!hub.image_url}
                  borderWidth={2}
                  className="drop-shadow-lg"
                />
              </div>
            
            <h1 className="text-5xl font-bold mb-4 text-white">
              {hub.name}
            </h1>
            
            {hub.description ? (
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                {hub.description}
              </p>
            ) : (
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                No description provided
              </p>
            )}
            
            {/* Online badge */}
            <div className="mt-6">
              <span className="inline-flex items-center px-4 py-2 bg-gray-800 bg-opacity-50 rounded-full text-sm text-gray-300">
                <span className="text-green-400 mr-2">🟢</span>
                {hub.fake_online_count || 12} {hub.member_nickname_plural || 'members'} online
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Create New Topic Card */}
          <div 
            className="bg-surface-dark rounded-lg p-6 border border-gray-600 border-dashed hover:border-hubcap-accent transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[160px]"
            onClick={() => setShowCreateTopic(true)}
          >
            <div className="w-12 h-12 rounded-full bg-hubcap-accent bg-opacity-20 flex items-center justify-center mb-4">
              <Plus size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Create New Topic</h3>
            <p className="text-sm text-gray-400 text-center mt-2">
              Add a topic to this hub
            </p>
          </div>

          {/* Existing Topics */}
          {topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onClick={handleTopicClick}
              onEdit={handleTopicEdit}
              onDelete={handleTopicDelete}
            />
          ))}
        </div>

        {topics.length === 0 && (
          <div className="text-center mt-12 text-gray-400">
            <p className="text-lg mb-2">No topics yet!</p>
            <p>Create your first topic to start curating content for <span className="text-white">{hub.name}</span>.</p>
          </div>
        )}
      </div>

      <CreateTopicModal
        isOpen={showCreateTopic}
        onClose={() => setShowCreateTopic(false)}
        onCreate={handleCreateTopic}
      />

      <CreateTopicModal
        isOpen={showEditTopic}
        onClose={() => {
          setShowEditTopic(false)
          setSelectedTopic(null)
        }}
        onCreate={handleEditTopic}
        isEditMode={true}
        initialData={selectedTopic ? {
          name: selectedTopic.name,
          description: selectedTopic.description,
          imageUrl: selectedTopic.image_url,
          color: selectedTopic.color
        } : undefined}
      />

      {/* Simple Delete Confirmation Modal for Topics */}
      {showDeleteTopic && selectedTopic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-dark rounded-lg p-6 w-full max-w-md border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Delete Topic</h2>
              <button
                onClick={() => {
                  setShowDeleteTopic(false)
                  setSelectedTopic(null)
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete "<span className="font-semibold text-white">{selectedTopic.name}</span>"? This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteTopic(false)
                  setSelectedTopic(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTopic}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md font-semibold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateHubModal
        isOpen={showEditHub}
        onClose={() => setShowEditHub(false)}
        onCreate={handleUpdateHub}
        isEditMode={true}
        initialData={hub ? {
          name: hub.name,
          description: hub.description,
          imageUrl: hub.image_url,
          color: hub.color,
          memberNicknamePlural: hub.member_nickname_plural,
          fakeOnlineCount: hub.fake_online_count
        } : undefined}
      />


      <DeleteHubModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onDelete={handleDeleteHub}
        hub={hub}
      />

    </main>
  )
}