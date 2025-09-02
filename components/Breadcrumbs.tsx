import { useRouter } from 'next/navigation'
import { House } from 'phosphor-react'
import HubLogo from './HubLogo'
import Image from 'next/image'

interface BreadcrumbItem {
  label: string
  href?: string
  active?: boolean
  isHome?: boolean
  imageUrl?: string
  hubColor?: string
  isHub?: boolean // Indicates if this item represents a hub (should use hexagon)
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  hubName?: string
  hubImageUrl?: string
  hubColor?: string
  topicName?: string
  topicImageUrl?: string
  subtopicName?: string
  subtopicImageUrl?: string
}

export default function Breadcrumbs({ 
  items, 
  hubName, 
  hubImageUrl,
  hubColor,
  topicName, 
  topicImageUrl,
  subtopicName,
  subtopicImageUrl
}: BreadcrumbsProps) {
  const router = useRouter()

  const handleClick = (href: string) => {
    router.push(href)
  }

  // Generate slug helper
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  // Build items from props if not provided directly
  const breadcrumbItems = items || (() => {
    const builtItems: BreadcrumbItem[] = [
      { label: 'Hubs', href: '/', isHome: true }
    ]
    
    if (hubName) {
      const hubSlug = generateSlug(hubName)
      builtItems.push({
        label: hubName,
        href: `/${hubSlug}`,
        active: !topicName && !subtopicName,
        imageUrl: hubImageUrl,
        hubColor: hubColor,
        isHub: true
      })
    }
    
    if (topicName && hubName) {
      const hubSlug = generateSlug(hubName)
      const topicSlug = generateSlug(topicName)
      builtItems.push({
        label: topicName,
        href: `/${hubSlug}/${topicSlug}`,
        active: !subtopicName,
        imageUrl: topicImageUrl,
        isHub: false
      })
    }
    
    if (subtopicName && topicName && hubName) {
      const hubSlug = generateSlug(hubName)
      const topicSlug = generateSlug(topicName)
      const subtopicSlug = generateSlug(subtopicName)
      builtItems.push({
        label: subtopicName,
        href: `/${hubSlug}/${topicSlug}/${subtopicSlug}`,
        active: true,
        imageUrl: subtopicImageUrl,
        isHub: false
      })
    }
    
    return builtItems
  })()

  const renderBreadcrumbContent = (item: BreadcrumbItem) => {
    if (item.isHome) {
      return (
        <House size={16} weight="fill" />
      )
    }
    
    return (
      <div className="flex items-center gap-2">
        {item.isHub ? (
          <HubLogo
            hubName={item.label}
            imageUrl={item.imageUrl}
            color={'#ffffff'}
            size={20}
            showLoading={false}
            borderWidth={2}
            borderColor={'white'}
          />
        ) : item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.label}
            width={16}
            height={16}
            className="w-4 h-4 rounded object-cover border border-white/100"
            unoptimized
          />
        ) : null}
        <span>{item.label}</span>
      </div>
    )
  }

  return (
    <nav className="flex items-center gap-4 text-sm mb-4">
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center gap-4">
          {item.href && !item.active ? (
            <button
              onClick={() => handleClick(item.href!)}
              className="text-gray-400 hover:text-white transition-colors flex items-center"
            >
              {renderBreadcrumbContent(item)}
            </button>
          ) : (
            <span className={`${item.active ? "text-white" : "text-gray-400"} flex items-center`}>
              {renderBreadcrumbContent(item)}
            </span>
          )}
          {index < breadcrumbItems.length - 1 && (
            <span className="text-gray-500">/</span>
          )}
        </div>
      ))}
    </nav>
  )
}