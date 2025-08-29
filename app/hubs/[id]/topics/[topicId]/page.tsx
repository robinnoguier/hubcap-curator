'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { SearchResponse, Link } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import ResultCard from '@/components/ResultCard'
import Breadcrumbs from '@/components/Breadcrumbs'

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

interface TopicWithHub {
  id: number
  name: string
  description?: string
  hub: {
    id: number
    name: string
    description?: string
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

interface TopicLinksResponse {
  allLinks: SearchResponseWithIds
  searches: SearchGroup[]
  totalSearches: number
  totalLinks: number
}

export default function TopicSearch() {
  const [topicInfo, setTopicInfo] = useState<TopicWithHub | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchDescription, setSearchDescription] = useState('')
  const [results, setResults] = useState<SearchResponseWithIds | null>(null)
  const [allSearches, setAllSearches] = useState<SearchGroup[]>([])
  const [selectedSearchId, setSelectedSearchId] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({
    long_form_videos: false,
    short_form_videos: false,
    articles: false,
    podcasts: false,
    images: false
  })
  
  const router = useRouter()
  const params = useParams()
  const hubId = parseInt(params.id as string)
  const topicId = parseInt(params.topicId as string)

  useEffect(() => {
    if (topicId) {
      fetchTopicInfo()
      fetchSavedLinks()
    }
  }, [topicId])

  const fetchTopicInfo = async () => {
    try {
      const response = await fetch(`/api/topics/${topicId}`)
      if (response.ok) {
        const data = await response.json()
        setTopicInfo({ 
          id: data.topic.id,
          name: data.topic.name,
          description: data.topic.description,
          hub: data.hub
        })
      } else {
        router.push(`/hubs/${hubId}`)
      }
    } catch (error) {
      console.error('Error fetching topic:', error)
      router.push(`/hubs/${hubId}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchSavedLinks = async () => {
    try {
      const response = await fetch(`/api/topics/${topicId}/links`)
      if (response.ok) {
        const data: TopicLinksResponse = await response.json()
        
        // Set all searches data
        setAllSearches(data.searches)
        
        // Convert database links to LinkWithId format
        const convertLinks = (links: any[]) => 
          links.map(link => ({
            ...link,
            id: link.id, // Use database ID
            isPlaying: false
          }))

        // Apply current filter
        const linksToShow = selectedSearchId === 'all' 
          ? data.allLinks 
          : data.searches.find(s => s.searchId === selectedSearchId)?.links || data.allLinks

        setResults({
          long_form_videos: convertLinks(linksToShow.long_form_videos || []),
          short_form_videos: convertLinks(linksToShow.short_form_videos || []),
          articles: convertLinks(linksToShow.articles || []),
          podcasts: convertLinks(linksToShow.podcasts || []),
          images: convertLinks(linksToShow.images || [])
        })
      }
    } catch (error) {
      console.error('Error fetching saved links:', error)
    }
  }

  const handleSearchSelection = (searchId: number | 'all') => {
    setSelectedSearchId(searchId)
    
    // Convert database links to LinkWithId format
    const convertLinks = (links: any[]) => 
      links.map(link => ({
        ...link,
        id: link.id,
        isPlaying: false
      }))

    if (searchId === 'all') {
      // Show all links from all searches
      const response = fetch(`/api/topics/${topicId}/links`).then(res => res.json()).then((data: TopicLinksResponse) => {
        setResults({
          long_form_videos: convertLinks(data.allLinks.long_form_videos || []),
          short_form_videos: convertLinks(data.allLinks.short_form_videos || []),
          articles: convertLinks(data.allLinks.articles || []),
          podcasts: convertLinks(data.allLinks.podcasts || []),
          images: convertLinks(data.allLinks.images || [])
        })
      })
    } else {
      // Show links from specific search
      const selectedSearch = allSearches.find(s => s.searchId === searchId)
      if (selectedSearch) {
        setResults({
          long_form_videos: convertLinks(selectedSearch.links.long_form_videos || []),
          short_form_videos: convertLinks(selectedSearch.links.short_form_videos || []),
          articles: convertLinks(selectedSearch.links.articles || []),
          podcasts: convertLinks(selectedSearch.links.podcasts || []),
          images: convertLinks(selectedSearch.links.images || [])
        })
      }
    }
  }

  const handleDeleteSearch = async (searchId: number, searchQuery: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the "${searchQuery}" search and ALL its links? This cannot be undone.`
    )
    
    if (!confirmed) return

    try {
      // First delete all links for this search
      const { error: linksError } = await supabase
        .from('links')
        .delete()
        .eq('search_id', searchId)
      
      if (linksError) throw linksError

      // Then delete the search itself
      const { error: searchError } = await supabase
        .from('searches')
        .delete()
        .eq('id', searchId)
      
      if (searchError) throw searchError

      // Update UI - remove from allSearches
      setAllSearches(prev => prev.filter(search => search.searchId !== searchId))
      
      // If we were viewing the deleted search, switch to ALL
      if (selectedSearchId === searchId) {
        setSelectedSearchId('all')
        fetchSavedLinks() // Refresh to show updated data
      } else {
        fetchSavedLinks() // Refresh data
      }
      
    } catch (error) {
      console.error('Error deleting search:', error)
      alert('Failed to delete search. Please try again.')
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !topicInfo) return
    
    setSearching(true)
    setLoadingProgress({
      long_form_videos: true,
      short_form_videos: true,
      articles: true,
      podcasts: true,
      images: true
    })
    
    // Keep existing results and just start loading new ones
    if (!results) {
      setResults({
        long_form_videos: [],
        short_form_videos: [],
        articles: [],
        podcasts: [],
        images: []
      })
    }
    
    try {
      const response = await fetch('/api/search-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          topic: searchQuery.trim(),
          topicId: topicInfo.id,
          searchDescription: searchDescription.trim() || undefined,
          hubName: topicInfo.hub.name,
          hubDescription: topicInfo.hub.description,
          topicName: topicInfo.name,
          topicDescription: topicInfo.description
        }),
      })
      
      if (!response.ok) {
        throw new Error('Search failed')
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
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'done') {
                setSearching(false)
                setLoadingProgress({
                  long_form_videos: false,
                  short_form_videos: false,
                  articles: false,
                  podcasts: false,
                  images: false
                })
                // Refresh searches list to include the new search
                setTimeout(() => fetchSavedLinks(), 1000)
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
                    return prev // Skip duplicate
                  }
                  return {
                    ...prev,
                    [category]: [...(prev[category] || []), link]
                  }
                })
              }
              
              // Legacy batch format support
              if (data.category && data.links) {
                const linksWithIds = data.links.map((link: any, idx: number) => ({
                  ...link,
                  id: Date.now() + Math.random() * 1000 + idx
                }))
                
                setResults(prev => {
                  if (!prev) return prev
                  const category = data.category as keyof SearchResponseWithIds
                  // Check for duplicates by URL before adding
                  const existingUrls = new Set((prev[category] || []).map(l => l.url))
                  const newLinks = linksWithIds.filter((link: any) => !existingUrls.has(link.url))
                  return {
                    ...prev,
                    [category]: [...(prev[category] || []), ...newLinks]
                  }
                })
                
                setLoadingProgress(prev => ({
                  ...prev,
                  [data.category]: false
                }))
              }
            } catch (e) {
              console.error('Error parsing stream data:', e, line)
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

  const handleRemoveLink = async (linkId: number) => {
    // Remove from UI immediately
    if (results) {
      const removeFromCategory = (links: LinkWithId[]) => 
        links.filter(link => link.id !== linkId)
      
      setResults({
        long_form_videos: removeFromCategory(results.long_form_videos || []),
        short_form_videos: removeFromCategory(results.short_form_videos || []),
        articles: removeFromCategory(results.articles || []),
        podcasts: removeFromCategory(results.podcasts || []),
        images: removeFromCategory(results.images || [])
      })
    }

    // Permanently delete from database
    try {
      const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', linkId)
      
      if (error) {
        console.error('Error deleting link from database:', error)
      }
    } catch (error) {
      console.error('Error deleting link from database:', error)
    }
  }

  const toggleVideoPlayback = (linkId: number) => {
    if (results) {
      const updateCategory = (links: LinkWithId[]) => 
        links.map(link => 
          link.id === linkId ? { ...link, isPlaying: !link.isPlaying } : { ...link, isPlaying: false }
        )
      
      setResults({
        long_form_videos: updateCategory(results.long_form_videos || []),
        short_form_videos: updateCategory(results.short_form_videos || []),
        articles: results.articles || [],
        podcasts: results.podcasts || [],
        images: results.images || []
      })
    }
  }

  const handleFeedback = async (linkId: number, feedback: 'like' | 'discard') => {
    // Placeholder for feedback functionality
    console.log('Feedback:', linkId, feedback)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-hubcap-bg text-hubcap-text">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-600 rounded w-1/3 mb-8"></div>
            <div className="h-12 bg-gray-700 rounded w-full mb-4"></div>
            <div className="h-20 bg-gray-700 rounded w-full"></div>
          </div>
        </div>
      </main>
    )
  }

  if (!topicInfo) {
    return (
      <main className="min-h-screen bg-hubcap-bg text-hubcap-text flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Topic Not Found</h1>
          <button
            onClick={() => router.push(`/hubs/${hubId}`)}
            className="px-4 py-2 bg-hubcap-accent rounded-md hover:bg-opacity-80 transition-colors"
          >
            Back to Hub
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-hubcap-bg text-hubcap-text">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Breadcrumb Navigation */}
        <div className="mb-8">
          <Breadcrumbs items={[
            { label: 'Hubs', href: '/' },
            { label: topicInfo.hub.name, href: `/hubs/${hubId}` },
            { label: topicInfo.name, active: true }
          ]} />
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
            <h1 className="text-3xl font-bold mb-2">
              <span className="text-hubcap-accent">{topicInfo.hub.name}</span> • {topicInfo.name}
            </h1>
            <div className="text-gray-300 space-y-1">
              {topicInfo.hub.description && (
                <p><strong>Hub:</strong> {topicInfo.hub.description}</p>
              )}
              {topicInfo.description && (
                <p><strong>Topic:</strong> {topicInfo.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Search Interface */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-hubcap-accent">Search within this topic</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What are you looking for? *
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSearch()}
                  placeholder={`e.g., "pre-workout meal ideas" or "advanced training techniques"`}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:border-transparent text-white placeholder-gray-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Additional context (optional)
                </label>
                <textarea
                  value={searchDescription}
                  onChange={(e) => setSearchDescription(e.target.value)}
                  placeholder="Add more specific details about what you're searching for..."
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:border-transparent text-white placeholder-gray-400 resize-none"
                  rows={3}
                />
              </div>
              
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="w-full px-6 py-3 bg-hubcap-accent hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
              >
                {searching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full loading-spinner"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search Content
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Search Pills */}
        {allSearches.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSearchSelection('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedSearchId === 'all'
                    ? 'bg-hubcap-accent text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
              >
                ALL ({allSearches.reduce((acc, search) => acc + search.linkCount, 0)})
              </button>
              
              {allSearches.map((search) => (
                <div
                  key={search.searchId}
                  className={`relative flex items-center gap-2 rounded-full text-sm font-medium transition-all duration-200 capitalize pl-1 pr-2 py-1 ${
                    selectedSearchId === search.searchId
                      ? 'bg-hubcap-accent text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                  }`}
                >
                  {/* Circular Unsplash Image */}
                  {search.pillImage ? (
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                      <img 
                        src={search.pillImage} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center">
                      <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15V7l5 5-5 5z"/>
                      </svg>
                    </div>
                  )}
                  
                  {/* Content */}
                  <button
                    onClick={() => handleSearchSelection(search.searchId)}
                    className="flex-1 text-left"
                    title={search.description || search.query}
                  >
                    {search.query.toLowerCase()} ({search.linkCount})
                  </button>
                  
                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSearch(search.searchId, search.query)
                    }}
                    className="w-4 h-4 rounded-full bg-red-600 bg-opacity-80 hover:bg-red-500 transition-all duration-200 flex items-center justify-center text-white text-xs flex-shrink-0"
                    title={`Delete "${search.query}" search`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {results && (
          <div className="space-y-12">
            {/* Show indicator if there are saved links */}
            {results && (results.long_form_videos.length > 0 || results.short_form_videos.length > 0 || results.articles.length > 0 || results.podcasts.length > 0 || results.images.length > 0) && !searching && selectedSearchId === 'all' && (
              <div className="text-center"></div>
            )}
            
            {/* Show specific search indicator */}
            {results && (results.long_form_videos.length > 0 || results.short_form_videos.length > 0 || results.articles.length > 0 || results.podcasts.length > 0 || results.images.length > 0) && !searching && selectedSearchId !== 'all' && (
              <div className="text-center py-4">
                <p className="text-gray-400 text-sm">
                  Showing links from: <span className="text-hubcap-accent capitalize">"{allSearches.find(s => s.searchId === selectedSearchId)?.query}"</span>
                </p>
              </div>
            )}
            
            <CategorySection
              title="Long-form Videos"
              links={results.long_form_videos}
              onFeedback={handleFeedback}
              onToggleVideo={toggleVideoPlayback}
              onRemove={handleRemoveLink}
              isLoading={loadingProgress.long_form_videos}
            />
            <CategorySection
              title="Short-form Videos"
              links={results.short_form_videos}
              onFeedback={handleFeedback}
              onToggleVideo={toggleVideoPlayback}
              onRemove={handleRemoveLink}
              isLoading={loadingProgress.short_form_videos}
            />
            <CategorySection
              title="Articles"
              links={results.articles}
              onFeedback={handleFeedback}
              onRemove={handleRemoveLink}
              isLoading={loadingProgress.articles}
            />
            <CategorySection
              title="Podcasts"
              links={results.podcasts}
              onFeedback={handleFeedback}
              onRemove={handleRemoveLink}
              isLoading={loadingProgress.podcasts}
            />
            <CategorySection
              title="Images"
              links={results.images}
              onFeedback={handleFeedback}
              onRemove={handleRemoveLink}
              isLoading={loadingProgress.images}
            />
          </div>
        )}

        {searching && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-hubcap-accent"></div>
            <p className="mt-2 text-gray-400">Searching for content...</p>
          </div>
        )}
      </div>
    </main>
  )
}

// Reuse the same components from the original page
interface CategorySectionProps {
  title: string
  links: LinkWithId[]
  onFeedback: (linkId: number, feedback: 'like' | 'discard') => void
  onToggleVideo?: (linkId: number) => void
  onRemove: (linkId: number) => void
  isLoading?: boolean
}

function CategorySection({ title, links, onFeedback, onToggleVideo, onRemove, isLoading }: CategorySectionProps) {
  const showSection = (links && links.length > 0) || isLoading

  if (!showSection) return null

  return (
    <section className="fade-in">
      <h2 className="text-2xl font-bold mb-6 text-hubcap-accent">
        {title}
        {isLoading && <span className="ml-2 text-sm text-gray-400">Loading...</span>}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading && (!links || links.length === 0) ? (
          Array.from({ length: 8 }, (_, i) => (
            <SkeletonCard key={`skeleton-${i}`} />
          ))
        ) : (
          (links || []).map((link) => (
            <ResultCard
              key={link.id}
              link={link}
              onFeedback={onFeedback}
              onToggleVideo={onToggleVideo}
              onRemove={onRemove}
            />
          ))
        )}
      </div>
    </section>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 animate-pulse">
      <div className="w-full h-48 bg-gray-700"></div>
      <div className="p-4">
        <div className="flex justify-start items-start mb-3">
          <div className="w-16 h-6 bg-gray-600 rounded-full"></div>
        </div>
        <div className="space-y-2 mb-3">
          <div className="h-4 bg-gray-600 rounded w-full"></div>
          <div className="h-4 bg-gray-600 rounded w-3/4"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-700 rounded w-full"></div>
          <div className="h-3 bg-gray-700 rounded w-4/5"></div>
          <div className="h-3 bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    </div>
  )
}