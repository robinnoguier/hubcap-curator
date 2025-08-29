export interface GiphyImage {
  url: string
  width: string
  height: string
}

export interface GiphyGif {
  id: string
  title: string
  images: {
    fixed_width_small: GiphyImage
    preview_gif: GiphyImage
    original: GiphyImage
  }
}

export interface GiphyResponse {
  data: GiphyGif[]
}

export async function searchGiphy(query: string, limit: number = 1): Promise<string | null> {
  const apiKey = process.env.GIPHY_API_KEY
  
  if (!apiKey) {
    console.error('GIPHY_API_KEY not found in environment variables')
    return null
  }

  try {
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=${limit}&offset=0&rating=g&lang=en&bundle=messaging_non_clips`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Giphy API error: ${response.status}`)
    }

    const data: GiphyResponse = await response.json()
    
    if (data.data && data.data.length > 0) {
      // Return the fixed_width_small image which is typically around 200px wide
      // We'll resize it to 48x48 in the component
      return data.data[0].images.fixed_width_small.url
    }
    
    return null
  } catch (error) {
    console.error('Error fetching from Giphy:', error)
    return null
  }
}

export async function getHubImage(hubName: string): Promise<string | null> {
  // Search for the most popular/relevant GIF for the hub topic
  return searchGiphy(hubName, 1)
}