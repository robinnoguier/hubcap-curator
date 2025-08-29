import { useRouter } from 'next/navigation'

interface BreadcrumbItem {
  label: string
  href?: string
  active?: boolean
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const router = useRouter()

  const handleClick = (href: string) => {
    router.push(href)
  }

  return (
    <nav className="flex items-center gap-2 text-sm mb-4">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {item.href && !item.active ? (
            <button
              onClick={() => handleClick(item.href!)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className={item.active ? "text-hubcap-accent" : "text-gray-400"}>
              {item.label}
            </span>
          )}
          {index < items.length - 1 && (
            <span className="text-gray-500">/</span>
          )}
        </div>
      ))}
    </nav>
  )
}