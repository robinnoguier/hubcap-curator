'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Link } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { generateSlug } from '@/lib/slug-utils'
import ResultCard from '@/components/ResultCard'
import Breadcrumbs from '@/components/Breadcrumbs'
import { useCache } from '@/lib/cache-context'
import Image from 'next/image'
import { Trash, MagnifyingGlass, ArrowLeft } from 'phosphor-react'
import SearchModal from '@/components/SearchModal'

interface LinkWithId extends Link {
  id: number;
  isPlaying?: boolean;
}

interface SearchResponseWithIds {
  long_form_videos: LinkWithId[];
  short_form_videos: LinkWithId[];
  articles: LinkWithId[];
  podcasts: LinkWithId[];
  images: LinkWithId[];
}

interface SubtopicWithTopicAndHub {
  id: number
  name: string
  description?: string
  image_url?: string
  color?: string
  topic: {
    id: number
    name: string
    description?: string
    image_url?: string
    color?: string
    hub: {
      id: number
      name: string
      description?: string
      image_url?: string
      color?: string
    }
  }
}

interface SearchGroup {
  searchId: number
  query: string
  description?: string
  created_at: string
  linkCount: number
  pillImage: string | null
  links: SearchResponseWithIds
}

interface SubtopicLinksResponse {
  allLinks: SearchResponseWithIds
  searches: SearchGroup[]
  totalSearches: number
  totalLinks: number
}

export default function SubtopicSearchBySlug() {
  const [subtopicInfo, setSubtopicInfo] = useState<SubtopicWithTopicAndHub | null>(null)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [results, setResults] = useState<SearchResponseWithIds | null>(null)
  const [allSearches, setAllSearches] = useState<SearchGroup[]>([])
  const [selectedSearchId, setSelectedSearchId] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({
    long_form_videos: false,
    short_form_videos: false,
    articles: false,
    podcasts: false,
    images: false
  })
  const [selectedLinks, setSelectedLinks] = useState<Set<number>>(new Set())
  const [sendingToSlack, setSendingToSlack] = useState(false)
  
  const router = useRouter()
  const params = useParams()
  const hubSlug = params.hubSlug as string
  const topicSlug = params.topicSlug as string
  const subtopicSlug = params.subtopicSlug as string
  const cache = useCache()

  useEffect(() => {
    if (hubSlug && topicSlug && subtopicSlug) {
      fetchSubtopicBySlug()
    }
  }, [hubSlug, topicSlug, subtopicSlug])

  const fetchSubtopicBySlug = async () => {
    try {
      // First try to get hubs from cache
      const cachedHubs = cache.getHubs()
      let subtopicData: SubtopicWithTopicAndHub | null = null

      if (cachedHubs && cachedHubs.length > 0) {
        // Find hub by slug
        const hub = cachedHubs.find(h => generateSlug(h.name) === hubSlug)
        if (hub) {
          // Get topics for this hub
          const { data: topics } = await supabase
            .from('topics')
            .select('*')
            .eq('hub_id', hub.id)

          if (topics) {
            const topic = topics.find(t => generateSlug(t.name) === topicSlug)
            if (topic) {
              // Get subtopics for this topic
              const { data: subtopics } = await supabase
                .from('subtopics')
                .select('*')
                .eq('topic_id', topic.id)

              if (subtopics) {
                const subtopic = subtopics.find(s => generateSlug(s.name) === subtopicSlug)
                if (subtopic) {
                  subtopicData = {
                    ...subtopic,
                    topic: {
                      ...topic,
                      hub: hub
                    }
                  }
                }
              }
            }
          }
        }
      }

      // If not found in cache, fetch directly
      if (!subtopicData) {
        const { data: hubs } = await supabase
          .from('hubs')
          .select('*')
        
        if (hubs) {
          const hub = hubs.find(h => generateSlug(h.name) === hubSlug)
          if (hub) {
            const { data: topics } = await supabase
              .from('topics')
              .select('*')
              .eq('hub_id', hub.id)

            if (topics) {
              const topic = topics.find(t => generateSlug(t.name) === topicSlug)
              if (topic) {
                const { data: subtopics } = await supabase
                  .from('subtopics')
                  .select('*')
                  .eq('topic_id', topic.id)

                if (subtopics) {
                  const subtopic = subtopics.find(s => generateSlug(s.name) === subtopicSlug)
                  if (subtopic) {
                    subtopicData = {
                      ...subtopic,
                      topic: {
                        ...topic,
                        hub: hub
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (subtopicData) {
        setSubtopicInfo(subtopicData)
        await fetchSubtopicLinks(subtopicData.id)
      } else {
        console.error('Subtopic not found')
        router.push('/')
      }
    } catch (error) {
      console.error('Error fetching subtopic:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubtopicLinks = async (subtopicId: number) => {
    try {
      const response = await fetch(`/api/subtopics/${subtopicId}/links`)
      if (response.ok) {
        const data: SubtopicLinksResponse = await response.json()
        setResults(data.allLinks)
        setAllSearches(data.searches)
      }
    } catch (error) {
      console.error('Error fetching subtopic links:', error)
    }
  }

  const handleSearch = async (searchQuery: string, searchDescription: string) => {
    if (!searchQuery.trim() || !subtopicInfo) return
    
    setSearching(true)
    setShowSearchModal(false)
    
    // Create a temporary search pill immediately
    const tempSearchId = Date.now()
    const tempSearchPill: SearchGroup = {
      searchId: tempSearchId,
      query: searchQuery.trim(),
      description: searchDescription.trim() || undefined,
      created_at: new Date().toISOString(),
      linkCount: 0,
      pillImage: null,
      links: {
        long_form_videos: [],
        short_form_videos: [],
        articles: [],
        podcasts: [],
        images: []
      }
    }
    
    // Add the temporary pill and select it
    setAllSearches(prev => [tempSearchPill, ...prev])
    setSelectedSearchId(tempSearchId)
    
    // Set up loading state for the new search
    setLoadingProgress({
      long_form_videos: true,
      short_form_videos: true,
      articles: true,
      podcasts: true,
      images: true
    })
    
    // Initialize empty results for the new search
    setResults({
      long_form_videos: [],
      short_form_videos: [],
      articles: [],
      podcasts: [],
      images: []
    })

    try {
      // Build the full context query including hub, topic, and subtopic
      const contextQuery = `${subtopicInfo.topic.hub.name} ${subtopicInfo.topic.name} ${subtopicInfo.name} ${searchQuery}`
      
      const response = await fetch('/api/search-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: contextQuery,
          originalQuery: searchQuery, // Pass the original query separately
          topicId: subtopicInfo.topic.id,
          subtopicId: subtopicInfo.id,
          searchDescription: searchDescription.trim() || undefined,
          hubName: subtopicInfo.topic.hub.name,
          hubDescription: subtopicInfo.topic.hub.description,
          topicName: subtopicInfo.topic.name,
          topicDescription: subtopicInfo.topic.description,
          subtopicName: subtopicInfo.name
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(`Search failed: ${response.status} ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')
      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += new TextDecoder().decode(value)
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const dataString = line.slice(6)
              console.log('Received stream data:', dataString)
              const data = JSON.parse(dataString)
              
              if (data.type === 'done') {
                setSearching(false)
                setLoadingProgress({
                  long_form_videos: false,
                  short_form_videos: false,
                  articles: false,
                  podcasts: false,
                  images: false
                })
                
                // Update the temporary pill with final link count
                setAllSearches(prev => 
                  prev.map(search => {
                    if (search.searchId === tempSearchId) {
                      const totalLinks = 
                        (results?.long_form_videos?.length || 0) +
                        (results?.short_form_videos?.length || 0) +
                        (results?.articles?.length || 0) +
                        (results?.podcasts?.length || 0) +
                        (results?.images?.length || 0)
                      
                      return {
                        ...search,
                        linkCount: totalLinks,
                        links: results || search.links
                      }
                    }
                    return search
                  })
                )
                
                // Refresh the saved links to get the actual searchId from database
                fetchSubtopicLinks(subtopicInfo.id)
                
                return
              }
              
              // Handle individual results from the new streaming format
              if (data.type === 'result') {
                const link = { 
                  ...data.result, 
                  id: Date.now() + Math.random() * 1000 
                }
                
                setResults(prev => {
                  if (!prev) return prev
                  const category = link.category as keyof SearchResponseWithIds
                  // Check for duplicates by URL before adding
                  const existingUrls = new Set((prev[category] || []).map(l => l.url))
                  if (existingUrls.has(link.url)) {
                    return prev
                  }
                  const newResults = {
                    ...prev,
                    [category]: [...(prev[category] || []), link]
                  }
                  
                  // Update the temporary pill's link count in real-time
                  setAllSearches(prevSearches => 
                    prevSearches.map(search => {
                      if (search.searchId === tempSearchId) {
                        const totalLinks = 
                          (newResults.long_form_videos?.length || 0) +
                          (newResults.short_form_videos?.length || 0) +
                          (newResults.articles?.length || 0) +
                          (newResults.podcasts?.length || 0) +
                          (newResults.images?.length || 0)
                        
                        return {
                          ...search,
                          linkCount: totalLinks,
                          links: newResults
                        }
                      }
                      return search
                    })
                  )
                  
                  return newResults
                })
                
                // Update loading progress for this category
                setLoadingProgress(prev => ({
                  ...prev,
                  [link.category]: false
                }))
              }
            } catch (error) {
              console.error('Error parsing stream data:', error, line)
            }
          }
        }
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearching(false)
      setLoadingProgress({
        long_form_videos: false,
        short_form_videos: false,
        articles: false,
        podcasts: false,
        images: false
      })
    }
  }

  const handleLinkSelection = (linkId: number, selected: boolean) => {
    setSelectedLinks(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(linkId)
      } else {
        newSet.delete(linkId)
      }
      return newSet
    })
  }

  const handleSendToSlack = async () => {
    if (selectedLinks.size === 0) return
    
    setSendingToSlack(true)
    
    // Collect selected links
    const allLinks = displayedResults ? [
      ...(displayedResults.long_form_videos || []),
      ...(displayedResults.short_form_videos || []),
      ...(displayedResults.articles || []),
      ...(displayedResults.podcasts || []),
      ...(displayedResults.images || [])
    ] : []
    
    const linksToSend = allLinks.filter(link => selectedLinks.has(link.id))
    
    try {
      const response = await fetch('/api/send-to-slack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          links: linksToSend,
          context: {
            hub: subtopicInfo?.topic.hub.name,
            topic: subtopicInfo?.topic.name,
            subtopic: subtopicInfo?.name
          }
        })
      })
      
      if (response.ok) {
        // Clear selection after successful send
        setSelectedLinks(new Set())
        alert('Links sent to Slack successfully!')
      } else {
        alert('Failed to send links to Slack')
      }
    } catch (error) {
      console.error('Error sending to Slack:', error)
      alert('Error sending links to Slack')
    } finally {
      setSendingToSlack(false)
    }
  }

  const handleDeleteSubtopic = async () => {
    if (!subtopicInfo) return
    
    setDeleting(true)
    try {
      const response = await fetch(`/api/subtopics/${subtopicInfo.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Navigate back to topic page
        router.push(`/${hubSlug}/${topicSlug}`)
      } else {
        console.error('Failed to delete subtopic')
      }
    } catch (error) {
      console.error('Error deleting subtopic:', error)
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const displayedResults = selectedSearchId === 'all' 
    ? results 
    : allSearches.find(s => s.searchId === selectedSearchId)?.links || null

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-hubcap-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading subtopic...</p>
        </div>
      </div>
    )
  }

  if (!subtopicInfo) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Subtopic not found</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-hubcap-bg text-hubcap-text">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <button
                onClick={() => router.push(`/${hubSlug}/${topicSlug}`)}
                className="bg-surface-dark hover:bg-gray-700 border border-gray-600 rounded-full p-2.5 transition-colors shadow-lg flex-shrink-0 flex items-center justify-center"
              >
                <ArrowLeft size={20} className="text-white" />
              </button>
              
              <div className="flex items-center mt-4">
                <Breadcrumbs items={[
              { label: 'Hubs', href: '/', isHome: true },
              { label: subtopicInfo.topic.hub.name, href: `/${generateSlug(subtopicInfo.topic.hub.name)}`, imageUrl: subtopicInfo.topic.hub.image_url, hubColor: subtopicInfo.topic.hub.color, isHub: true },
              { label: subtopicInfo.topic.name, href: `/${generateSlug(subtopicInfo.topic.hub.name)}/${generateSlug(subtopicInfo.topic.name)}`, imageUrl: subtopicInfo.topic.image_url, isHub: false },
              { label: subtopicInfo.name, active: true, imageUrl: subtopicInfo.image_url, isHub: false }
            ]} />
              </div>
            </div>
            
            {/* Delete Button */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center gap-2"
              >
                <Trash size={16} />
                Delete
              </button>
            </div>
          </div>
          
          {/* Large Centered Subtopic Display */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-32 h-32 relative overflow-hidden rounded-2xl shadow-lg">
                {subtopicInfo.image_url ? (
                  <Image
                    src={subtopicInfo.image_url}
                    alt={`${subtopicInfo.name} icon`}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                    priority
                    unoptimized
                  />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center text-white font-bold text-4xl"
                    style={{ 
                      backgroundColor: subtopicInfo.color || 'rgba(255, 255, 255, 0.1)',
                      color: subtopicInfo.color ? '#ffffff' : 'rgba(255, 255, 255, 0.5)'
                    }}
                  >
                    {subtopicInfo.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            
            <h1 className="text-5xl font-bold mb-4 text-white">
              {subtopicInfo.name}
            </h1>
            
            {subtopicInfo.description ? (
              <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-6">
                {subtopicInfo.description}
              </p>
            ) : (
              <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-6">
                No description provided
              </p>
            )}
          </div>
        </div>

        {/* Search Pills */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative group">
            <button
              onClick={() => setSelectedSearchId('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors pr-8 ${
                selectedSearchId === 'all'
                  ? 'bg-hubcap-accent text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Results ({allSearches.reduce((total, search) => total + search.linkCount, 0)})
            </button>
            <button
              onClick={() => {
                // Reset to first search or clear selection
                if (allSearches.length > 0) {
                  setSelectedSearchId(allSearches[0].searchId)
                }
              }}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-red-500 bg-opacity-0 hover:bg-opacity-100 transition-all duration-200 flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100"
              title="Clear filter"
            >
              ✕
            </button>
          </div>
          
          {allSearches.map((search) => (
            <div key={search.searchId} className="relative group">
              <button
                onClick={() => setSelectedSearchId(search.searchId)}
                className={`rounded-full text-sm font-medium transition-colors pr-8 flex items-center gap-2 ${
                  selectedSearchId === search.searchId
                    ? 'bg-hubcap-accent text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } ${search.pillImage ? 'pl-2 py-1' : 'px-4 py-2'}`}
              >
                {search.pillImage && (
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                    <img
                      src={search.pillImage}
                      alt={`${search.query} thumbnail`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <span className={search.pillImage ? 'pr-2' : ''}>
                  {search.query} ({search.linkCount})
                </span>
              </button>
              <button
                onClick={() => {
                  // TODO: Implement delete search functionality
                  console.log('Delete search:', search.searchId)
                }}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-red-500 bg-opacity-0 hover:bg-opacity-100 transition-all duration-200 flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100"
                title="Delete search"
              >
                ✕
              </button>
            </div>
          ))}
          
          <button
            onClick={() => setShowSearchModal(true)}
            className="px-4 py-2 rounded-full text-sm font-medium bg-hubcap-accent bg-opacity-20 text-white hover:bg-opacity-30 transition-colors flex items-center gap-2"
          >
            <MagnifyingGlass size={16} />
            Find New Links
          </button>
        </div>

        {/* Results */}
        {displayedResults ? (
          <div className="space-y-8">
            <CategorySection 
              title="Long-form Videos" 
              links={displayedResults.long_form_videos || []} 
              onFeedback={() => {}}
              onToggleVideo={() => {}}
              onRemove={() => {}}
              isLoading={loadingProgress.long_form_videos}
              selectedLinks={selectedLinks}
              onSelectionChange={handleLinkSelection}
            />
            <CategorySection 
              title="Short-form Videos" 
              links={displayedResults.short_form_videos || []} 
              onFeedback={() => {}}
              onToggleVideo={() => {}}
              onRemove={() => {}}
              isLoading={loadingProgress.short_form_videos}
              selectedLinks={selectedLinks}
              onSelectionChange={handleLinkSelection}
            />
            <CategorySection 
              title="Articles" 
              links={displayedResults.articles || []} 
              onFeedback={() => {}}
              onRemove={() => {}}
              isLoading={loadingProgress.articles}
              selectedLinks={selectedLinks}
              onSelectionChange={handleLinkSelection}
            />
            <CategorySection 
              title="Podcasts" 
              links={displayedResults.podcasts || []} 
              onFeedback={() => {}}
              onRemove={() => {}}
              isLoading={loadingProgress.podcasts}
              selectedLinks={selectedLinks}
              onSelectionChange={handleLinkSelection}
            />
            <CategorySection 
              title="Images" 
              links={displayedResults.images || []} 
              onFeedback={() => {}}
              onRemove={() => {}}
              isLoading={loadingProgress.images}
              selectedLinks={selectedLinks}
              onSelectionChange={handleLinkSelection}
            />
          </div>
        ) : (
          !searching && (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No content yet for this subtopic.</p>
              <button
                onClick={() => setShowSearchModal(true)}
                className="px-6 py-3 bg-hubcap-accent rounded-md hover:bg-opacity-80 transition-colors font-semibold"
              >
                Start Your First Search
              </button>
            </div>
          )
        )}
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSearch={handleSearch}
        searching={searching}
        entityName="subtopic"
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-dark rounded-lg p-6 w-full max-w-md border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-red-400">Delete Subtopic</h2>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-white"
                disabled={deleting}
              >
                ✕
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Are you sure you want to delete "{subtopicInfo?.name}"? This will permanently remove:
              </p>
              <ul className="text-sm text-gray-400 space-y-1 ml-4">
                <li>• All searches in this subtopic</li>
                <li>• All saved links</li>
                <li>• All associated data</li>
              </ul>
              <p className="text-red-400 text-sm mt-4 font-semibold">
                This action cannot be undone.
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
                onClick={handleDeleteSubtopic}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete Subtopic'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Banner for Slack */}
      {selectedLinks.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 z-50">
          <div className="container mx-auto max-w-7xl flex items-center justify-between">
            <div className="text-white">
              <span className="font-semibold">{selectedLinks.size}</span> link{selectedLinks.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedLinks(new Set())}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                Clear Selection
              </button>
              <button
                onClick={handleSendToSlack}
                disabled={sendingToSlack}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-md transition-colors font-semibold flex items-center gap-2"
              >
                {sendingToSlack ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    Send to Slack
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}

interface CategorySectionProps {
  title: string
  links: LinkWithId[]
  onFeedback: (linkId: number, feedback: 'like' | 'discard') => void
  onToggleVideo?: (linkId: number) => void
  onRemove: (linkId: number) => void
  isLoading?: boolean
  selectedLinks: Set<number>
  onSelectionChange: (linkId: number, selected: boolean) => void
}

function CategorySection({ title, links, onFeedback, onToggleVideo, onRemove, isLoading, selectedLinks, onSelectionChange }: CategorySectionProps) {
  if (!links.length && !isLoading) {
    return null
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {isLoading && (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-hubcap-accent"></div>
        )}
        <span className="text-sm text-gray-400">({links.length})</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {links.map((link) => (
          <ResultCard
            key={link.id}
            link={link}
            onFeedback={onFeedback}
            onToggleVideo={onToggleVideo}
            onRemove={onRemove}
            isSelected={selectedLinks.has(link.id)}
            onSelectionChange={onSelectionChange}
          />
        ))}
      </div>
    </div>
  )
}