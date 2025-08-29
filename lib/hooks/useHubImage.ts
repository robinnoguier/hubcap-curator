import { useState, useEffect } from 'react'

export function useHubImage(hubName: string) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHubImage() {
      if (!hubName) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/giphy?q=${encodeURIComponent(hubName)}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch hub image')
        }

        const data = await response.json()
        setImageUrl(data.imageUrl)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setImageUrl(null)
      } finally {
        setLoading(false)
      }
    }

    fetchHubImage()
  }, [hubName])

  return { imageUrl, loading, error }
}