'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Hub, Topic } from '@/lib/supabase'
import { generateSlug } from '@/lib/slug-utils'
import TopicCard from '@/components/TopicCard'
import Breadcrumbs from '@/components/Breadcrumbs'
import GiphyImagePicker from '@/components/GiphyImagePicker'
import ColorPicker from '@/components/ColorPicker'
import { useHubImage } from '@/lib/hooks/useHubImage'
import { useCache } from '@/lib/cache-context'
import Image from 'next/image'

export default function HubDetailBySlug() {
  const [hub, setHub] = useState<Hub | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateTopic, setShowCreateTopic] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')
  const [newTopicDescription, setNewTopicDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [showEditHub, setShowEditHub] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editHubName, setEditHubName] = useState('')
  const [editHubDescription, setEditHubDescription] = useState('')
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
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

  const handleCreateTopic = async () => {
    if (!newTopicName.trim() || !hub) return
    
    setCreating(true)
    try {
      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hubId: hub.id,
          name: newTopicName.trim(),
          description: newTopicDescription.trim() || undefined
        }),
      })
      
      if (response.ok) {
        const newTopic = await response.json()
        const updatedTopics = [newTopic, ...topics]
        setTopics(updatedTopics)
        if (hub) {
          cache.invalidateCache('hubTopics', hub.id)
          cache.setHubWithTopics(hub.id, { hub, topics: updatedTopics })
        }
        setShowCreateTopic(false)
        setNewTopicName('')
        setNewTopicDescription('')
      }
    } catch (error) {
      console.error('Error creating topic:', error)
    } finally {
      setCreating(false)
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
    if (hub) {
      setEditHubName(hub.name)
      setEditHubDescription(hub.description || '')
      setSelectedImageUrl(hub.image_url || null)
      setSelectedColor(hub.color || null)
      setShowEditHub(true)
    }
  }

  const handleUpdateHub = async () => {
    if (!editHubName.trim() || !hub) return
    
    setUpdating(true)
    try {
      const response = await fetch(`/api/hubs/${hub.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editHubName.trim(),
          description: editHubDescription.trim() || undefined,
          imageUrl: selectedImageUrl,
          color: selectedColor
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
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteHub = async () => {
    if (!hub) return
    
    setDeleting(true)
    try {
      const response = await fetch(`/api/hubs/${hub.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        cache.invalidateCache('hubs')
        cache.invalidateCache('hubTopics', hub.id)
        router.push('/')
      }
    } catch (error) {
      console.error('Error deleting hub:', error)
    } finally {
      setDeleting(false)
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
                <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
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
          className="absolute h-2 inset-0 pointer-events-none"
          style={{
            backgroundColor: hub.color,
            opacity: 1
          }}
        />
      )}
      
      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <Breadcrumbs items={[
              { label: 'Hubs', href: '/' },
              { label: hub.name, active: true }
            ]} />
            
            {/* Edit and Delete Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleEditClick}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
          
          {/* Large Centered Hub Display */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-32 h-32 relative overflow-hidden rounded-2xl shadow-lg">
                {!hub.image_url && imageLoading && (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white/70 rounded-full animate-spin"></div>
                  </div>
                )}
                {displayImageUrl && (
                  <Image
                    src={displayImageUrl}
                    alt={`${hub.name} icon`}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                )}
                {!displayImageUrl && !imageLoading && (
                  <div 
                    className="w-full h-full flex items-center justify-center text-white font-bold text-4xl"
                    style={{ 
                      backgroundColor: hub.color || 'rgba(255, 255, 255, 0.1)',
                      color: hub.color ? '#ffffff' : 'rgba(255, 255, 255, 0.5)'
                    }}
                  >
                    {hub.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
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
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Create New Topic Card */}
          <div 
            className="bg-gray-800 rounded-lg p-6 border border-gray-600 border-dashed hover:border-hubcap-accent transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[160px]"
            onClick={() => setShowCreateTopic(true)}
          >
            <div className="w-12 h-12 rounded-full bg-hubcap-accent bg-opacity-20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-hubcap-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-hubcap-accent">Create New Topic</h3>
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
            />
          ))}
        </div>

        {topics.length === 0 && (
          <div className="text-center mt-12 text-gray-400">
            <p className="text-lg mb-2">No topics yet!</p>
            <p>Create your first topic to start curating content for <span className="text-hubcap-accent">{hub.name}</span>.</p>
          </div>
        )}
      </div>

      {/* Create Topic Modal */}
      {showCreateTopic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
             style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-hubcap-accent">Create New Topic</h2>
              <button
                onClick={() => {
                  setShowCreateTopic(false)
                  setNewTopicName('')
                  setNewTopicDescription('')
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Topic Name *
                </label>
                <input
                  type="text"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="e.g., Nutrition, Training, Recovery"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:border-transparent text-white placeholder-gray-400"
                  maxLength={50}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newTopicDescription}
                  onChange={(e) => setNewTopicDescription(e.target.value)}
                  placeholder="Describe what this topic will cover..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:border-transparent text-white placeholder-gray-400 resize-none"
                  rows={3}
                  maxLength={200}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateTopic(false)
                  setNewTopicName('')
                  setNewTopicDescription('')
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTopic}
                disabled={!newTopicName.trim() || creating}
                className="flex-1 px-4 py-2 bg-hubcap-accent hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors"
              >
                {creating ? 'Creating...' : 'Create Topic'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Hub Modal */}
      {showEditHub && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
             style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-hubcap-accent">Edit Hub</h2>
              <button
                onClick={() => setShowEditHub(false)}
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
                  value={editHubName}
                  onChange={(e) => setEditHubName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:border-transparent text-white placeholder-gray-400"
                  maxLength={50}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={editHubDescription}
                  onChange={(e) => setEditHubDescription(e.target.value)}
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
                  query={editHubName}
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
                onClick={() => setShowEditHub(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateHub}
                disabled={!editHubName.trim() || updating}
                className="flex-1 px-4 py-2 bg-hubcap-accent hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors"
              >
                {updating ? 'Updating...' : 'Update Hub'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
             style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-red-400">Delete Hub</h2>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-white"
                disabled={deleting}
              >
                ✕
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-3">
                Are you sure you want to delete <strong className="text-white">"{hub?.name}"</strong>?
              </p>
              <p className="text-red-400 text-sm">
                This will permanently delete the hub and all of its topics, searches, and links. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteHub}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed rounded-md font-semibold transition-colors text-white"
              >
                {deleting ? 'Deleting...' : 'Delete Hub'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}