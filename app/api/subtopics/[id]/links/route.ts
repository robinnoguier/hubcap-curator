import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/subtopics/[id]/links - Get all links for a subtopic
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const subtopicId = parseInt(params.id)
    
    // Get all searches for this subtopic
    const { data: searches, error: searchError } = await supabase
      .from('searches')
      .select('*')
      .eq('subtopic_id', subtopicId)
      .order('created_at', { ascending: false })

    if (searchError) {
      console.error('Error fetching searches:', searchError)
      return NextResponse.json(
        { error: 'Failed to fetch searches' },
        { status: 500 }
      )
    }

    // Get all links for these searches
    const searchIds = searches?.map(s => s.id) || []
    
    const { data: links, error: linksError } = await supabase
      .from('links')
      .select('*')
      .in('search_id', searchIds)

    if (linksError) {
      console.error('Error fetching links:', linksError)
      return NextResponse.json(
        { error: 'Failed to fetch links' },
        { status: 500 }
      )
    }

    // Organize links by search and type
    const allLinks = {
      long_form_videos: [] as any[],
      short_form_videos: [] as any[],
      articles: [] as any[],
      podcasts: [] as any[],
      images: [] as any[]
    }

    const searchGroups = searches?.map(search => {
      const searchLinks = links?.filter(l => l.search_id === search.id) || []
      
      const groupedLinks = {
        long_form_videos: [] as any[],
        short_form_videos: [] as any[],
        articles: [] as any[],
        podcasts: [] as any[],
        images: [] as any[]
      }

      searchLinks.forEach(link => {
        const linkWithId = { ...link, id: link.id }
        const category = link.category as keyof typeof groupedLinks
        if (groupedLinks[category]) {
          groupedLinks[category].push(linkWithId)
          allLinks[category].push(linkWithId)
        }
      })

      // Get first image for pill
      const firstImage = groupedLinks.images[0] || 
                        groupedLinks.long_form_videos[0] || 
                        groupedLinks.short_form_videos[0]

      return {
        searchId: search.id,
        query: search.search_keywords || search.topic || search.query, // Use search_keywords (original query) if available
        description: search.search_description || search.description,
        created_at: search.created_at,
        linkCount: searchLinks.length,
        pillImage: firstImage?.thumbnail || null,
        links: groupedLinks
      }
    }) || []

    return NextResponse.json({
      allLinks,
      searches: searchGroups,
      totalSearches: searches?.length || 0,
      totalLinks: links?.length || 0
    })
  } catch (error) {
    console.error('Error fetching subtopic links:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subtopic links' },
      { status: 500 }
    )
  }
}