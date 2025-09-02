'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Hub, Topic } from '@/lib/supabase'
import TopicCard from '@/components/TopicCard'
import Breadcrumbs from '@/components/Breadcrumbs'

export default function HubDetail() {
  const [hub, setHub] = useState<Hub | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateTopic, setShowCreateTopic] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')
  const [newTopicDescription, setNewTopicDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const params = useParams()
  const hubId = parseInt(params.id as string)

  useEffect(() => {
    if (hubId) {
      fetchHubData()
    }
  }, [hubId])

  const fetchHubData = async () => {
    try {
      const response = await fetch(`/api/hubs/${hubId}`)
      if (response.ok) {
        const data = await response.json()
        setHub(data.hub)
        setTopics(data.topics)
      } else {
        router.push('/') // Redirect if hub not found
      }
    } catch (error) {
      console.error('Error fetching hub:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTopic = async () => {
    if (!newTopicName.trim()) return
    
    setCreating(true)
    try {
      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hubId,
          name: newTopicName.trim(),
          description: newTopicDescription.trim() || undefined
        }),
      })
      
      if (response.ok) {
        const newTopic = await response.json()
        setTopics([newTopic, ...topics])
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
    router.push(`/hubs/${hubId}/topics/${topicId}`)
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
    <main className="min-h-screen bg-hubcap-bg text-hubcap-text">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Breadcrumbs items={[
            { label: 'Hubs', href: '/', isHome: true },
            { label: hub.name, active: true, imageUrl: hub.image_url }
          ]} />
          
          <h1 className="text-4xl font-bold mb-4">
            <span className="text-white">{hub.name}</span> Topics
          </h1>
          {hub.description && (
            <p className="text-xl text-gray-300 mb-4">{hub.description}</p>
          )}
          <p className="text-gray-500">
            Create topics to organize your content searches
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Create New Topic Card */}
          <div 
            className="white-10 rounded-lg p-6 border border-gray-600 border-dashed hover:border-hubcap-accent transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[160px]"
            onClick={() => setShowCreateTopic(true)}
          >
            <div className="w-12 h-12 rounded-full bg-hubcap-accent bg-opacity-20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
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

      {/* Create Topic Modal */}
      {showCreateTopic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="white-10 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Create New Topic</h2>
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
    </main>
  )
}