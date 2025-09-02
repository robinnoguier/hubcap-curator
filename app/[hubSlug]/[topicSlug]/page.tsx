'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { SearchResponse, Link } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { generateSlug } from '@/lib/slug-utils'
import ResultCard from '@/components/ResultCard'
import Breadcrumbs from '@/components/Breadcrumbs'
import CreateTopicModal from '@/components/CreateTopicModal'
import { useCache } from '@/lib/cache-context'
import Image from 'next/image'
import { PencilSimple, Trash, MagnifyingGlass, Plus, ArrowLeft } from 'phosphor-react'
import CreateSubtopicModal from '@/components/CreateSubtopicModal'
import SubtopicCard from '@/components/SubtopicCard'
import { Subtopic } from '@/lib/supabase'
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

interface TopicWithHub {
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
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [results, setResults] = useState<SearchResponseWithIds | null>(null)
  const [allSearches, setAllSearches] = useState<SearchGroup[]>([])
  const [selectedSearchId, setSelectedSearchId] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [showEditTopic, setShowEditTopic] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [subtopics, setSubtopics] = useState<Subtopic[]>([])
  const [showCreateSubtopic, setShowCreateSubtopic] = useState(false)
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
              image_url: cachedTopicDetails.topic.image_url,
              color: cachedTopicDetails.topic.color,
              hub: cachedTopicDetails.hub
            })
            fetchSavedLinks(matchingTopic.id)
            fetchSubtopics(matchingTopic.id)
          } else {
            const topicResponse = await fetch(`/api/topics/${matchingTopic.id}`)
            if (topicResponse.ok) {
              const topicData = await topicResponse.json()
              cache.setTopicDetails(matchingTopic.id, topicData)
              setTopicInfo({ 
                id: topicData.topic.id,
                name: topicData.topic.name,
                description: topicData.topic.description,
                image_url: topicData.topic.image_url,
                color: topicData.topic.color,
                hub: topicData.hub
              })
              fetchSavedLinks(matchingTopic.id)
              fetchSubtopics(matchingTopic.id)
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
            // Show results for the real search only if we don't already have current results
            if (!results || Object.values(results).every(arr => arr.length === 0)) {
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
            }
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

  const fetchSubtopics = async (topicId: number) => {
    try {
      console.log('Fetching subtopics for topic:', topicId)
      const response = await fetch(`/api/topics/${topicId}/subtopics`)
      if (response.ok) {
        const subtopicData = await response.json()
        console.log('Fetched subtopics:', subtopicData)
        setSubtopics(subtopicData)
      } else {
        console.error('Failed to fetch subtopics:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching subtopics:', error)
    }
  }

  const handleCreateSubtopic = async (subtopicData: {
    name: string
    description?: string
    imageUrl?: string | null
    color?: string | null
  }) => {
    if (!topicInfo) return

    try {
      const response = await fetch('/api/subtopics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId: topicInfo.id,
          name: subtopicData.name,
          description: subtopicData.description,
          imageUrl: subtopicData.imageUrl,
          color: subtopicData.color
        }),
      })

      if (response.ok) {
        const newSubtopic = await response.json()
        setSubtopics(prev => [newSubtopic, ...prev])
      }
    } catch (error) {
      console.error('Error creating subtopic:', error)
      throw error
    }
  }

  const handleCreateBulkSubtopics = async (selectedSubtopics: any[]) => {
    if (!topicInfo) return

    try {
      const response = await fetch('/api/subtopics/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId: topicInfo.id,
          subtopics: selectedSubtopics.map(s => ({
            name: s.name,
            description: s.description,
            imageUrl: s.imageUrl,
            color: s.color
          }))
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Bulk create response:', result)
        setSubtopics(prev => [...result.subtopics, ...prev])
      } else {
        const error = await response.json()
        console.error('Failed to create subtopics:', error)
        alert(`Failed to create subtopics: ${error.details || error.error}`)
      }
    } catch (error) {
      console.error('Error creating subtopics:', error)
      throw error
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

  const handleSearch = async (searchQuery: string, searchDescription: string) => {
    if (!searchQuery.trim() || !topicInfo) return
    
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
        console.error('Search request failed:', response.status, response.statusText)
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
                
                // Invalidate topic links cache - no need to refresh immediately since we already have the results
                cache.invalidateCache('topicLinks', topicInfo.id)
                
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
    try {
      // Collect all selected links
      const allLinks: LinkWithId[] = []
      if (results) {
        Object.values(results).forEach(category => {
          category.forEach((link: LinkWithId) => {
            if (selectedLinks.has(link.id)) {
              allLinks.push(link)
            }
          })
        })
      }
      
      const response = await fetch('/api/send-to-slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          links: allLinks,
          context: {
            hub: topicInfo?.hub.name,
            topic: topicInfo?.name
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

  const handleEditClick = () => {
    setShowEditTopic(true)
  }

  const handleUpdateTopic = async (topicData: { name: string; description?: string; imageUrl?: string | null; color?: string | null }) => {
    if (!topicInfo) return
    
    try {
      const response = await fetch(`/api/topics/${topicInfo.id}`, {
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
        setTopicInfo({
          ...topicInfo,
          name: updatedTopic.name,
          description: updatedTopic.description,
          image_url: updatedTopic.image_url,
          color: updatedTopic.color
        })
        
        // Clear cache
        cache.invalidateCache('topicDetails', topicInfo.id)
        
        setShowEditTopic(false)
      }
    } catch (error) {
      console.error('Error updating topic:', error)
      throw error
    }
  }

  const handleDeleteTopic = async () => {
    if (!topicInfo) return
    
    setDeleting(true)
    try {
      const response = await fetch(`/api/topics/${topicInfo.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Clear cache and redirect to hub page
        cache.invalidateCache('topicDetails', topicInfo.id)
        cache.invalidateCache('hubTopics', topicInfo.hub.id)
        router.push(`/${generateSlug(topicInfo.hub.name)}`)
      }
    } catch (error) {
      console.error('Error deleting topic:', error)
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
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="bg-surface-dark rounded-lg p-6 border border-gray-700">
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
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <button
                onClick={() => router.push(`/${hubSlug}`)}
                className="bg-surface-dark hover:bg-gray-700 border border-gray-600 rounded-full p-2.5 transition-colors shadow-lg flex-shrink-0 flex items-center justify-center"
              >
                <ArrowLeft size={20} className="text-white" />
              </button>
              
              <div className="flex items-center mt-4">
                <Breadcrumbs items={[
                  { label: 'Hubs', href: '/', isHome: true },
                  { label: topicInfo.hub.name, href: `/${generateSlug(topicInfo.hub.name)}`, imageUrl: topicInfo.hub.image_url, hubColor: topicInfo.hub.color, isHub: true },
                  { label: topicInfo.name, active: true, imageUrl: topicInfo.image_url, isHub: false }
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
          
          {/* Large Centered Topic Display */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-32 h-32 relative overflow-hidden rounded-2xl shadow-lg">
                {topicInfo.image_url && (
                  <Image
                    src={topicInfo.image_url}
                    alt={`${topicInfo.name} icon`}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                )}
                {!topicInfo.image_url && (
                  <div 
                    className="w-full h-full flex items-center justify-center text-white font-bold text-4xl"
                    style={{ 
                      backgroundColor: topicInfo.color || 'rgba(255, 255, 255, 0.1)',
                      color: topicInfo.color ? '#ffffff' : 'rgba(255, 255, 255, 0.5)'
                    }}
                  >
                    {topicInfo.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            
            <h1 className="text-5xl font-bold mb-4 text-white">
              {topicInfo.name}
            </h1>
            
            {topicInfo.description ? (
              <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-6">
                {topicInfo.description}
              </p>
            ) : (
              <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-6">
                No description provided
              </p>
            )}
          </div>
        </div>

        {/* Subtopics Section */}
        {(subtopics.length > 0 || !loading) && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-white">Subtopics</h2>
              <button
                onClick={() => setShowCreateSubtopic(true)}
                className="px-4 py-2 bg-hubcap-accent hover:bg-opacity-80 rounded-md transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Plus size={16} />
                Add Subtopics
              </button>
            </div>
            
            {subtopics.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {subtopics.map((subtopic) => (
                  <SubtopicCard
                    key={subtopic.id}
                    id={subtopic.id}
                    name={subtopic.name}
                    imageUrl={subtopic.image_url}
                    color={subtopic.color}
                    hubSlug={hubSlug}
                    topicSlug={topicSlug}
                    onEdit={() => {
                      // Handle edit subtopic
                      console.log('Edit subtopic:', subtopic.name)
                    }}
                    onDelete={() => {
                      // Handle delete subtopic
                      console.log('Delete subtopic:', subtopic.name)
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-gray-400 mb-4">No subtopics yet.</p>
                <button
                  onClick={() => setShowCreateSubtopic(true)}
                  className="px-6 py-3 bg-hubcap-accent hover:bg-opacity-80 rounded-md transition-colors font-medium"
                >
                  Create Your First Subtopic
                </button>
              </div>
            )}
          </div>
        )}

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
            className="px-4 py-2 rounded-full text-sm font-medium bg-hubcap-accent bg-opacity-20 text-white hover:bg-opacity-30 transition-colors flex items-center gap-2"
          >
            <MagnifyingGlass size={16} />
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
              selectedLinks={selectedLinks}
              onSelectionChange={handleLinkSelection}
            />
            <CategorySection 
              title="Short-form Videos" 
              links={results.short_form_videos || []} 
              onFeedback={handleFeedback}
              onToggleVideo={toggleVideoPlayback}
              onRemove={handleRemoveLink}
              isLoading={loadingProgress.short_form_videos}
              selectedLinks={selectedLinks}
              onSelectionChange={handleLinkSelection}
            />
            <CategorySection 
              title="Articles" 
              links={results.articles || []} 
              onFeedback={handleFeedback}
              onRemove={handleRemoveLink}
              isLoading={loadingProgress.articles}
              selectedLinks={selectedLinks}
              onSelectionChange={handleLinkSelection}
            />
            <CategorySection 
              title="Podcasts" 
              links={results.podcasts || []} 
              onFeedback={handleFeedback}
              onRemove={handleRemoveLink}
              isLoading={loadingProgress.podcasts}
              selectedLinks={selectedLinks}
              onSelectionChange={handleLinkSelection}
            />
            <CategorySection 
              title="Images" 
              links={results.images || []} 
              onFeedback={handleFeedback}
              onRemove={handleRemoveLink}
              isLoading={loadingProgress.images}
              selectedLinks={selectedLinks}
              onSelectionChange={handleLinkSelection}
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
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSearch={handleSearch}
        searching={searching}
        entityName="topic"
      />

      {/* Edit Topic Modal */}
      <CreateTopicModal
        isOpen={showEditTopic}
        onClose={() => setShowEditTopic(false)}
        onCreate={handleUpdateTopic}
        isEditMode={true}
        initialData={topicInfo ? {
          name: topicInfo.name,
          description: topicInfo.description,
          imageUrl: topicInfo.image_url,
          color: topicInfo.color
        } : undefined}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-dark rounded-lg p-6 w-full max-w-md border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-red-400">Delete Topic</h2>
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
                Are you sure you want to delete "{topicInfo?.name}"? This will permanently remove:
              </p>
              <ul className="text-sm text-gray-400 space-y-1 ml-4">
                <li>• All searches in this topic</li>
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
                onClick={handleDeleteTopic}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete Topic'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Subtopic Modal */}
      <CreateSubtopicModal
        isOpen={showCreateSubtopic}
        onClose={() => setShowCreateSubtopic(false)}
        hubName={topicInfo?.hub.name || ''}
        hubDescription={topicInfo?.hub.description}
        topicName={topicInfo?.name || ''}
        topicDescription={topicInfo?.description}
        onCreate={handleCreateSubtopic}
        onCreateBulk={handleCreateBulkSubtopics}
      />

      {/* Slack Send Banner */}
      {selectedLinks.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-4 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="text-white">
              {selectedLinks.size} link{selectedLinks.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleSendToSlack}
              disabled={sendingToSlack}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md font-semibold transition-colors"
            >
              {sendingToSlack ? 'Sending...' : 'Send to Slack'}
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
  selectedLinks?: Set<number>
  onSelectionChange?: (linkId: number, selected: boolean) => void
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
            isSelected={selectedLinks?.has(link.id)}
            onSelectionChange={onSelectionChange}
          />
        ))}
      </div>
    </div>
  )
}