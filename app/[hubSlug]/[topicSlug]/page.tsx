'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { SearchResponse, Link } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { generateSlug } from '@/lib/slug-utils'
import ResultCard from '@/components/ResultCard'
import Breadcrumbs from '@/components/Breadcrumbs'
import { useCache } from '@/lib/cache-context'

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

export default function TopicSearchBySlug() {
  const [topicInfo, setTopicInfo] = useState<TopicWithHub | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchDescription, setSearchDescription] = useState('')
  const [showSearchModal, setShowSearchModal] = useState(false)
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
  const hubSlug = params.hubSlug as string
  const topicSlug = params.topicSlug as string
  const cache = useCache()

  useEffect(() => {
    if (hubSlug && topicSlug) {
      fetchTopicBySlug()
    }
  }, [hubSlug, topicSlug])

  const fetchTopicBySlug = async () => {
    try {
      // First try to get hubs from cache
      let hubs = cache.getHubs()
      
      if (!hubs) {
        const hubsResponse = await fetch('/api/hubs')
        if (hubsResponse.ok) {
          hubs = await hubsResponse.json()
          if (hubs) {
            cache.setHubs(hubs)
          }
        } else {
          router.push('/')
          return
        }
      }
      
      const matchingHub = hubs?.find((h: any) => generateSlug(h.name) === hubSlug)
      
      if (matchingHub) {
        // Try to get hub with topics from cache
        let hubWithTopics = cache.getHubWithTopics(matchingHub.id)
        
        if (!hubWithTopics) {
          const topicsResponse = await fetch(`/api/hubs/${matchingHub.id}`)
          if (topicsResponse.ok) {
            const data = await topicsResponse.json()
            hubWithTopics = { hub: data.hub, topics: data.topics }
            cache.setHubWithTopics(matchingHub.id, hubWithTopics)
          } else {
            router.push('/')
            return
          }
        }
        
        const matchingTopic = hubWithTopics.topics.find((t: any) => generateSlug(t.name) === topicSlug)
        
        if (matchingTopic) {
          // Check cache for topic details
          const cachedTopicDetails = cache.getTopicDetails(matchingTopic.id)
          
          if (cachedTopicDetails) {
            setTopicInfo({ 
              id: cachedTopicDetails.topic.id,
              name: cachedTopicDetails.topic.name,
              description: cachedTopicDetails.topic.description,
              hub: cachedTopicDetails.hub
            })
            fetchSavedLinks(matchingTopic.id)
          } else {
            const topicResponse = await fetch(`/api/topics/${matchingTopic.id}`)
            if (topicResponse.ok) {
              const topicData = await topicResponse.json()
              cache.setTopicDetails(matchingTopic.id, topicData)
              setTopicInfo({ 
                id: topicData.topic.id,
                name: topicData.topic.name,
                description: topicData.topic.description,
                hub: topicData.hub
              })
              fetchSavedLinks(matchingTopic.id)
            } else {
              router.push(`/${hubSlug}`)
            }
          }
        } else {
          router.push(`/${hubSlug}`)
        }
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Error fetching topic by slug:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const fetchSavedLinks = async (topicId: number) => {
    try {
      // Check cache first
      const cachedTopicLinks = cache.getTopicLinks(topicId)
      
      let data: TopicLinksResponse
      
      if (cachedTopicLinks) {
        data = cachedTopicLinks
      } else {
        const response = await fetch(`/api/topics/${topicId}/links`)
        if (response.ok) {
          data = await response.json()
          cache.setTopicLinks(topicId, data)
        } else {
          return
        }
      }
        
      // Set all searches data
      setAllSearches(data.searches)
      
      // If we had a temporary search selected, try to find the real one
      if (typeof selectedSearchId === 'number' && selectedSearchId > 1000000000000) {
        // This was a temporary ID (timestamp), find the matching real search
        const currentTempSearch = allSearches.find(s => s.searchId === selectedSearchId)
        if (currentTempSearch) {
          const realSearch = data.searches.find(s => 
            s.query.toLowerCase() === currentTempSearch.query.toLowerCase()
          )
          if (realSearch) {
            setSelectedSearchId(realSearch.searchId)
            // Show results for the real search
            const convertLinks = (links: any[]) => 
              links.map(link => ({
                ...link,
                id: link.id,
                isPlaying: false
              }))

            setResults({
              long_form_videos: convertLinks(realSearch.links.long_form_videos || []),
              short_form_videos: convertLinks(realSearch.links.short_form_videos || []),
              articles: convertLinks(realSearch.links.articles || []),
              podcasts: convertLinks(realSearch.links.podcasts || []),
              images: convertLinks(realSearch.links.images || [])
            })
            return
          }
        }
      }
      
      // Convert database links to LinkWithId format
      const convertLinks = (links: any[]) => 
        links.map(link => ({
          ...link,
          id: link.id,
          isPlaying: false
        }))

      // Show all links by default
      const linksToShow = selectedSearchId === 'all' ? data.allLinks : 
        data.searches.find(s => s.searchId === selectedSearchId)?.links || data.allLinks

      setResults({
        long_form_videos: convertLinks(linksToShow.long_form_videos || []),
        short_form_videos: convertLinks(linksToShow.short_form_videos || []),
        articles: convertLinks(linksToShow.articles || []),
        podcasts: convertLinks(linksToShow.podcasts || []),
        images: convertLinks(linksToShow.images || [])
      });
    } catch (error) {
      console.error('Error fetching saved links:', error);
    }
  };

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
      if (topicInfo) {
        fetch(`/api/topics/${topicInfo.id}/links`).then(res => res.json()).then((data: TopicLinksResponse) => {
          setResults({
            long_form_videos: convertLinks(data.allLinks.long_form_videos || []),
            short_form_videos: convertLinks(data.allLinks.short_form_videos || []),
            articles: convertLinks(data.allLinks.articles || []),
            podcasts: convertLinks(data.allLinks.podcasts || []),
            images: convertLinks(data.allLinks.images || [])
          })
        })
      }
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
    if (!confirm(`Are you sure you want to delete the search "${searchQuery}"? This will also delete all associated links.`)) {
      return
    }
    
    try {
      const response = await fetch(`/api/searches?searchId=${searchId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Remove from state
        setAllSearches(prev => prev.filter(s => s.searchId !== searchId))
        
        // If this was the selected search, switch to 'all'
        if (selectedSearchId === searchId) {
          setSelectedSearchId('all')
          handleSearchSelection('all')
        }
        
        // Refresh the data to show updated results
        if (topicInfo) {
          cache.invalidateCache('topicLinks', topicInfo.id)
          // Refresh the saved links to reflect the deletion
          fetchSavedLinks(topicInfo.id)
        }
      } else {
        const errorData = await response.json()
        console.error('Error deleting search:', errorData.error)
        alert('Failed to delete search: ' + errorData.error)
      }
    } catch (error) {
      console.error('Error deleting search:', error)
      alert('Failed to delete search. Please try again.')
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !topicInfo) return
    
    setSearching(true)
    
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
                
                // Invalidate topic links cache and refresh searches list
                cache.invalidateCache('topicLinks', topicInfo.id)
                setTimeout(() => {
                  fetchSavedLinks(topicInfo.id).then(() => {
                    // After refresh, we'll keep the selection on the newest search
                  })
                }, 1000)
                
                // Clear the search inputs
                setSearchQuery('')
                setSearchDescription('')
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
      } else {
        // Invalidate topic links cache after successful deletion
        if (topicInfo) {
          cache.invalidateCache('topicLinks', topicInfo.id)
        }
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
            <div className="h-8 bg-gray-600 rounded w-1/4 mb-4"></div>
            <div className="h-6 bg-gray-700 rounded w-1/2 mb-8"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="h-48 bg-gray-700 rounded mb-4"></div>
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

  if (!topicInfo) {
    return (
      <main className="min-h-screen bg-hubcap-bg text-hubcap-text flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Topic Not Found</h1>
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
        <div className="mb-8">
          <Breadcrumbs items={[
            { label: 'Hubs', href: '/' },
            { label: topicInfo.hub.name, href: `/${generateSlug(topicInfo.hub.name)}` },
            { label: topicInfo.name, active: true }
          ]} />
          
          <h1 className="text-4xl font-bold mb-4">{topicInfo.name}</h1>
          {topicInfo.description && (
            <p className="text-xl text-gray-300 mb-6">{topicInfo.description}</p>
          )}
        </div>

        {/* Search Pills */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative group">
            <button
              onClick={() => handleSearchSelection('all')}
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
                  handleSearchSelection(allSearches[0].searchId)
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
                onClick={() => handleSearchSelection(search.searchId)}
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
                onClick={() => handleDeleteSearch(search.searchId, search.query)}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-red-500 bg-opacity-0 hover:bg-opacity-100 transition-all duration-200 flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100"
                title="Delete search"
              >
                ✕
              </button>
            </div>
          ))}
          
          <button
            onClick={() => setShowSearchModal(true)}
            className="px-4 py-2 rounded-full text-sm font-medium bg-hubcap-accent bg-opacity-20 text-hubcap-accent hover:bg-opacity-30 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Find New Links
          </button>
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-8">
            <CategorySection 
              title="Long-form Videos" 
              links={results.long_form_videos || []} 
              onFeedback={handleFeedback}
              onToggleVideo={toggleVideoPlayback}
              onRemove={handleRemoveLink}
              isLoading={loadingProgress.long_form_videos}
            />
            <CategorySection 
              title="Short-form Videos" 
              links={results.short_form_videos || []} 
              onFeedback={handleFeedback}
              onToggleVideo={toggleVideoPlayback}
              onRemove={handleRemoveLink}
              isLoading={loadingProgress.short_form_videos}
            />
            <CategorySection 
              title="Articles" 
              links={results.articles || []} 
              onFeedback={handleFeedback}
              onRemove={handleRemoveLink}
              isLoading={loadingProgress.articles}
            />
            <CategorySection 
              title="Podcasts" 
              links={results.podcasts || []} 
              onFeedback={handleFeedback}
              onRemove={handleRemoveLink}
              isLoading={loadingProgress.podcasts}
            />
            <CategorySection 
              title="Images" 
              links={results.images || []} 
              onFeedback={handleFeedback}
              onRemove={handleRemoveLink}
              isLoading={loadingProgress.images}
            />
          </div>
        )}

        {!results && !searching && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No content yet for this topic.</p>
            <button
              onClick={() => setShowSearchModal(true)}
              className="px-6 py-3 bg-hubcap-accent rounded-md hover:bg-opacity-80 transition-colors font-semibold"
            >
              Start Your First Search
            </button>
          </div>
        )}
      </div>

      {/* Search Modal */}
      {showSearchModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSearchModal(false)
            }
          }}
        >
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-semibold text-hubcap-accent mb-4">Find New Links</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What are you looking for? *
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSearch()}
                  placeholder="e.g., best sleep masks, bedtime routine"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:border-transparent text-white placeholder-gray-400"
                  maxLength={100}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Additional context (optional)
                </label>
                <textarea
                  value={searchDescription}
                  onChange={(e) => setSearchDescription(e.target.value)}
                  placeholder="Any additional details or specific requirements..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-hubcap-accent focus:border-transparent text-white placeholder-gray-400 resize-none"
                  rows={3}
                  maxLength={200}
                />
              </div>
            </div>

            <button
              onClick={() => {
                setShowSearchModal(false)
                handleSearch()
              }}
              disabled={!searchQuery.trim() || searching}
              className="w-full mt-6 px-4 py-2 bg-hubcap-accent hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {searching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Searching...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Find Links
                </>
              )}
            </button>
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
}

function CategorySection({ title, links, onFeedback, onToggleVideo, onRemove, isLoading }: CategorySectionProps) {
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
          />
        ))}
      </div>
    </div>
  )
}