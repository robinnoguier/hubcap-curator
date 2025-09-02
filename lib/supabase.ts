import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for better TypeScript support
export interface Hub {
  id: number
  name: string
  description?: string
  image_url?: string
  color?: string
  member_nickname_plural?: string
  fake_online_count?: number
  created_at: string
  updated_at: string
  topic_count?: number
}

export interface Topic {
  id: number
  hub_id: number
  name: string
  description?: string
  image_url?: string
  color?: string
  created_at: string
  updated_at: string
  subtopic_count?: number
}

export interface Subtopic {
  id: number
  topic_id: number
  name: string
  description?: string
  image_url?: string
  color?: string
  created_at: string
  updated_at: string
}

export interface Search {
  id: number
  topic_id?: number
  topic: string
  search_description?: string
  search_keywords?: string
  created_at: string
  total_links: number
}

export interface DbLink {
  id: number
  search_id: number
  title: string
  url: string
  snippet?: string
  source: string
  category: 'long_form_videos' | 'short_form_videos' | 'articles' | 'podcasts' | 'images'
  thumbnail?: string
  creator?: string
  published_at?: string
  duration_sec?: number
  is_removed: boolean
  created_at: string
}

export interface UserFeedback {
  id: number
  link_id: number
  feedback: 'like' | 'discard'
  created_at: string
}

export interface SearchResult {
  title: string
  url: string
  description?: string
  image?: string
  category: 'youtube' | 'web' | 'news' | 'images'
  source?: string
  user?: {
    name: string
  }
}

// Helper functions for database operations
export const hubOperations = {
  // Get all hubs
  async getAll() {
    const { data, error } = await supabase
      .from('hubs')
      .select('*, topics(count)')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Transform the data to include topic_count
    const hubsWithCounts = data?.map(hub => ({
      ...hub,
      topic_count: hub.topics?.[0]?.count || 0,
      topics: undefined // Remove the topics array from the result
    })) || []
    
    return hubsWithCounts as Hub[]
  },

  // Create a new hub
  async create(name: string, description?: string, imageUrl?: string, color?: string, memberNicknamePlural?: string, fakeOnlineCount?: number) {
    const { data, error } = await supabase
      .from('hubs')
      .insert({ 
        name, 
        description, 
        image_url: imageUrl, 
        color, 
        member_nickname_plural: memberNicknamePlural,
        fake_online_count: fakeOnlineCount
      })
      .select()
      .single()
    
    if (error) throw error
    return data as Hub
  },

  // Get hub by ID with its topics
  async getWithTopics(hubId: number) {
    const { data: hub, error: hubError } = await supabase
      .from('hubs')
      .select('*')
      .eq('id', hubId)
      .single()
    
    if (hubError) throw hubError

    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('*')
      .eq('hub_id', hubId)
      .order('created_at', { ascending: false })
    
    if (topicsError) throw topicsError

    return { hub: hub as Hub, topics: topics as Topic[] }
  },

  // Update hub
  async update(hubId: number, name: string, description?: string, imageUrl?: string, color?: string, memberNicknamePlural?: string, fakeOnlineCount?: number) {
    const { data, error } = await supabase
      .from('hubs')
      .update({ 
        name, 
        description, 
        image_url: imageUrl, 
        color, 
        member_nickname_plural: memberNicknamePlural,
        fake_online_count: fakeOnlineCount,
        updated_at: new Date().toISOString() 
      })
      .eq('id', hubId)
      .select()
      .single()
    
    if (error) throw error
    return data as Hub
  },

  // Delete hub and all related data
  async delete(hubId: number) {
    // Delete in correct order to maintain referential integrity
    // Get topic IDs first
    const { data: topics } = await supabase
      .from('topics')
      .select('id')
      .eq('hub_id', hubId)
    
    if (topics && topics.length > 0) {
      const topicIds = topics.map(t => t.id)
      
      // Get search IDs
      const { data: searches } = await supabase
        .from('searches')
        .select('id')
        .in('topic_id', topicIds)
      
      if (searches && searches.length > 0) {
        const searchIds = searches.map(s => s.id)
        
        // 1. Delete links first (they reference searches)
        await supabase
          .from('links')
          .delete()
          .in('search_id', searchIds)
      }

      // 2. Delete searches (they reference topics)
      await supabase
        .from('searches')
        .delete()
        .in('topic_id', topicIds)
    }

    // 3. Delete topics (they reference hubs)
    await supabase
      .from('topics')
      .delete()
      .eq('hub_id', hubId)

    // 4. Finally delete the hub
    const { error } = await supabase
      .from('hubs')
      .delete()
      .eq('id', hubId)
    
    if (error) throw error
  }
}

export const topicOperations = {
  // Create a new topic
  async create(hubId: number, name: string, description?: string, imageUrl?: string, color?: string) {
    const { data, error } = await supabase
      .from('topics')
      .insert({ hub_id: hubId, name, description, image_url: imageUrl, color })
      .select()
      .single()
    
    if (error) throw error
    return data as Topic
  },

  // Get topic by ID
  async getById(topicId: number) {
    const { data, error } = await supabase
      .from('topics')
      .select(`
        *,
        hub:hubs(*)
      `)
      .eq('id', topicId)
      .single()
    
    if (error) throw error
    return data
  },

  // Get topics for a hub
  async getByHub(hubId: number) {
    const { data, error } = await supabase
      .from('topics')
      .select('*, subtopics(count)')
      .eq('hub_id', hubId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Transform the data to include subtopic_count
    const topicsWithCounts = data?.map(topic => ({
      ...topic,
      subtopic_count: topic.subtopics?.[0]?.count || 0,
      subtopics: undefined // Remove the subtopics array from the result
    })) || []
    
    return topicsWithCounts as Topic[]
  },

  // Update topic
  async update(topicId: number, name: string, description?: string, imageUrl?: string, color?: string) {
    const { data, error } = await supabase
      .from('topics')
      .update({ 
        name, 
        description, 
        image_url: imageUrl, 
        color, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', topicId)
      .select()
      .single()
    
    if (error) throw error
    return data as Topic
  },

  // Delete topic and all related data
  async delete(topicId: number) {
    // Get search IDs for this topic
    const { data: searches } = await supabase
      .from('searches')
      .select('id')
      .eq('topic_id', topicId)
    
    if (searches && searches.length > 0) {
      const searchIds = searches.map(s => s.id)
      
      // Delete links first (they reference searches)
      await supabase
        .from('links')
        .delete()
        .in('search_id', searchIds)

      // Delete searches (they reference topics)
      await supabase
        .from('searches')
        .delete()
        .eq('topic_id', topicId)
    }

    // Finally delete the topic
    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('id', topicId)
    
    if (error) throw error
  }
}

export const searchOperations = {
  // Create a new search
  async create(topic: string, searchKeywords?: string, topicId?: number, searchDescription?: string, subtopicId?: number) {
    const { data, error } = await supabase
      .from('searches')
      .insert({ 
        topic, 
        search_keywords: searchKeywords,
        topic_id: topicId,
        search_description: searchDescription,
        subtopic_id: subtopicId
      })
      .select()
      .single()
    
    if (error) throw error
    return data as Search
  },

  // Get recent searches
  async getRecent(limit: number = 10) {
    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data as Search[]
  },

  // Update total links count
  async updateLinkCount(searchId: number, count: number) {
    const { error } = await supabase
      .from('searches')
      .update({ total_links: count })
      .eq('id', searchId)
    
    if (error) throw error
  },

  // Delete search and all its links
  async delete(searchId: number) {
    // First delete all links associated with this search
    await supabase
      .from('links')
      .delete()
      .eq('search_id', searchId)

    // Then delete the search itself
    const { error } = await supabase
      .from('searches')
      .delete()
      .eq('id', searchId)
    
    if (error) throw error
  }
}

export const linkOperations = {
  // Save multiple links for a search
  async saveMany(searchId: number, links: any[]) {
    const linksToInsert = links.map(link => ({
      search_id: searchId,
      title: link.title,
      url: link.url,
      snippet: link.snippet,
      source: link.source,
      category: link.category,
      thumbnail: link.thumbnail,
      creator: link.creator || link.user?.name,
      published_at: link.published_at,
      duration_sec: link.duration_sec
    }))

    const { data, error } = await supabase
      .from('links')
      .insert(linksToInsert)
      .select()
    
    if (error) {
      console.error('Error saving links:', error)
      // Don't throw error, just log it so the app continues working
      return []
    }
    
    return data as DbLink[]
  },

  // Get links for a search
  async getBySearch(searchId: number) {
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('search_id', searchId)
      .eq('is_removed', false)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data as DbLink[]
  },

  // Mark link as removed
  async markAsRemoved(linkId: number) {
    const { error } = await supabase
      .from('links')
      .update({ is_removed: true })
      .eq('id', linkId)
    
    if (error) throw error
  },

  // Get all links by category
  async getByCategory(category: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('category', category)
      .eq('is_removed', false)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data as DbLink[]
  }
}