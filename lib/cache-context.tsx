'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Hub, Topic } from './supabase'

interface SearchGroup {
  searchId: number
  query: string
  description?: string
  created_at: string
  linkCount: number
  pillImage: string | null
  links: any
}

interface TopicLinksResponse {
  allLinks: any
  searches: SearchGroup[]
  totalSearches: number
  totalLinks: number
}

interface CacheData {
  hubs?: Hub[]
  hubTopics?: { [hubId: number]: { hub: Hub; topics: Topic[] } }
  topicDetails?: { [topicId: number]: any }
  topicLinks?: { [topicId: number]: TopicLinksResponse }
  lastUpdated?: { [key: string]: number }
}

interface CacheContextType {
  // Data
  getHubs: () => Hub[] | null
  getHubWithTopics: (hubId: number) => { hub: Hub; topics: Topic[] } | null
  getTopicDetails: (topicId: number) => any | null
  getTopicLinks: (topicId: number) => TopicLinksResponse | null
  
  // Setters
  setHubs: (hubs: Hub[]) => void
  setHubWithTopics: (hubId: number, data: { hub: Hub; topics: Topic[] }) => void
  setTopicDetails: (topicId: number, data: any) => void
  setTopicLinks: (topicId: number, data: TopicLinksResponse) => void
  
  // Cache management
  invalidateCache: (type?: 'hubs' | 'hubTopics' | 'topicDetails' | 'topicLinks', id?: number) => void
  isCacheValid: (type: string, id?: number) => boolean
  clearAllCache: () => void
}

const CacheContext = createContext<CacheContextType | undefined>(undefined)

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

export function CacheProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<CacheData>({})

  const isCacheValid = useCallback((type: string, id?: number) => {
    const key = id ? `${type}-${id}` : type
    const lastUpdated = cache.lastUpdated?.[key]
    if (!lastUpdated) return false
    return Date.now() - lastUpdated < CACHE_DURATION
  }, [cache.lastUpdated])

  const updateLastUpdated = useCallback((type: string, id?: number) => {
    const key = id ? `${type}-${id}` : type
    setCache(prev => ({
      ...prev,
      lastUpdated: {
        ...prev.lastUpdated,
        [key]: Date.now()
      }
    }))
  }, [])

  // Getters
  const getHubs = useCallback(() => {
    if (!isCacheValid('hubs')) return null
    return cache.hubs || null
  }, [cache.hubs, isCacheValid])

  const getHubWithTopics = useCallback((hubId: number) => {
    if (!isCacheValid('hubTopics', hubId)) return null
    return cache.hubTopics?.[hubId] || null
  }, [cache.hubTopics, isCacheValid])

  const getTopicDetails = useCallback((topicId: number) => {
    if (!isCacheValid('topicDetails', topicId)) return null
    return cache.topicDetails?.[topicId] || null
  }, [cache.topicDetails, isCacheValid])

  const getTopicLinks = useCallback((topicId: number) => {
    if (!isCacheValid('topicLinks', topicId)) return null
    return cache.topicLinks?.[topicId] || null
  }, [cache.topicLinks, isCacheValid])

  // Setters
  const setHubs = useCallback((hubs: Hub[]) => {
    setCache(prev => ({ ...prev, hubs }))
    updateLastUpdated('hubs')
  }, [updateLastUpdated])

  const setHubWithTopics = useCallback((hubId: number, data: { hub: Hub; topics: Topic[] }) => {
    setCache(prev => ({
      ...prev,
      hubTopics: {
        ...prev.hubTopics,
        [hubId]: data
      }
    }))
    updateLastUpdated('hubTopics', hubId)
  }, [updateLastUpdated])

  const setTopicDetails = useCallback((topicId: number, data: any) => {
    setCache(prev => ({
      ...prev,
      topicDetails: {
        ...prev.topicDetails,
        [topicId]: data
      }
    }))
    updateLastUpdated('topicDetails', topicId)
  }, [updateLastUpdated])

  const setTopicLinks = useCallback((topicId: number, data: TopicLinksResponse) => {
    setCache(prev => ({
      ...prev,
      topicLinks: {
        ...prev.topicLinks,
        [topicId]: data
      }
    }))
    updateLastUpdated('topicLinks', topicId)
  }, [updateLastUpdated])

  // Cache management
  const invalidateCache = useCallback((type?: 'hubs' | 'hubTopics' | 'topicDetails' | 'topicLinks', id?: number) => {
    if (!type) {
      // Invalidate all cache
      setCache({ lastUpdated: {} })
      return
    }

    if (id) {
      const key = `${type}-${id}`
      setCache(prev => {
        const newLastUpdated = { ...prev.lastUpdated }
        delete newLastUpdated[key]
        
        const newCache = { ...prev, lastUpdated: newLastUpdated }
        
        if (type === 'hubTopics' && prev.hubTopics) {
          const newHubTopics = { ...prev.hubTopics }
          delete newHubTopics[id]
          newCache.hubTopics = newHubTopics
        } else if (type === 'topicDetails' && prev.topicDetails) {
          const newTopicDetails = { ...prev.topicDetails }
          delete newTopicDetails[id]
          newCache.topicDetails = newTopicDetails
        } else if (type === 'topicLinks' && prev.topicLinks) {
          const newTopicLinks = { ...prev.topicLinks }
          delete newTopicLinks[id]
          newCache.topicLinks = newTopicLinks
        }
        
        return newCache
      })
    } else {
      // Invalidate all entries of this type
      setCache(prev => {
        const newLastUpdated = { ...prev.lastUpdated }
        Object.keys(newLastUpdated).forEach(key => {
          if (key.startsWith(type)) {
            delete newLastUpdated[key]
          }
        })
        
        const newCache = { ...prev, lastUpdated: newLastUpdated }
        if (type === 'hubs') newCache.hubs = undefined
        if (type === 'hubTopics') newCache.hubTopics = {}
        if (type === 'topicDetails') newCache.topicDetails = {}
        if (type === 'topicLinks') newCache.topicLinks = {}
        
        return newCache
      })
    }
  }, [])

  const clearAllCache = useCallback(() => {
    setCache({ lastUpdated: {} })
  }, [])

  const contextValue: CacheContextType = {
    getHubs,
    getHubWithTopics,
    getTopicDetails,
    getTopicLinks,
    setHubs,
    setHubWithTopics,
    setTopicDetails,
    setTopicLinks,
    invalidateCache,
    isCacheValid,
    clearAllCache
  }

  return <CacheContext.Provider value={contextValue}>{children}</CacheContext.Provider>
}

export function useCache() {
  const context = useContext(CacheContext)
  if (context === undefined) {
    throw new Error('useCache must be used within a CacheProvider')
  }
  return context
}