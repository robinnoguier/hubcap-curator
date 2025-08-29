import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const topicId = parseInt(params.id)
    
    if (isNaN(topicId)) {
      return NextResponse.json(
        { error: 'Invalid topic ID' },
        { status: 400 }
      )
    }

    // Get all searches for this topic with their links
    const { data: searches, error: searchError } = await supabase
      .from('searches')
      .select(`
        id,
        topic,
        search_description,
        created_at,
        links (
          id,
          title,
          url,
          snippet,
          source,
          category,
          thumbnail,
          creator,
          published_at,
          duration_sec,
          created_at
        )
      `)
      .eq('topic_id', topicId)
      .eq('links.is_removed', false)
      .order('created_at', { ascending: false })

    if (searchError) throw searchError

    // Process searches and their links
    const searchesData = searches?.map(search => ({
      id: search.id,
      query: search.topic,
      description: search.search_description,
      created_at: search.created_at,
      links: search.links?.map(link => ({
        ...link,
        id: link.id,
        title: link.title,
        url: link.url,
        snippet: link.snippet || '',
        source: link.source,
        category: link.category,
        topic: search.topic,
        thumbnail: link.thumbnail,
        creator: link.creator,
        published_at: link.published_at,
        duration_sec: link.duration_sec,
        created_at: link.created_at,
        searchId: search.id
      })) || []
    })) || []

    // Flatten all links from all searches
    const allLinks = searchesData.flatMap(search => search.links)

    // Group by category for ALL view
    const allLinksGrouped = {
      long_form_videos: allLinks.filter(link => link.category === 'long_form_videos'),
      short_form_videos: allLinks.filter(link => link.category === 'short_form_videos'),
      articles: allLinks.filter(link => link.category === 'articles'),
      podcasts: allLinks.filter(link => link.category === 'podcasts'),
      images: allLinks.filter(link => link.category === 'images')
    }

    // Group by individual searches
    const searchGroups = searchesData.map(search => {
      const images = search.links.filter(link => link.category === 'images')
      const firstUnsplashImage = images.find(link => link.source === 'Unsplash')
      
      return {
        searchId: search.id,
        query: search.query,
        description: search.description,
        created_at: search.created_at,
        linkCount: search.links.length,
        pillImage: firstUnsplashImage?.thumbnail || null, // First Unsplash image for the pill
        links: {
          long_form_videos: search.links.filter(link => link.category === 'long_form_videos'),
          short_form_videos: search.links.filter(link => link.category === 'short_form_videos'),
          articles: search.links.filter(link => link.category === 'articles'),
          podcasts: search.links.filter(link => link.category === 'podcasts'),
          images: images
        }
      }
    })

    return NextResponse.json({
      allLinks: allLinksGrouped,
      searches: searchGroups,
      totalSearches: searchGroups.length,
      totalLinks: allLinks.length
    })
  } catch (error) {
    console.error('Error fetching topic links:', error)
    return NextResponse.json(
      { error: 'Failed to fetch topic links' },
      { status: 500 }
    )
  }
}