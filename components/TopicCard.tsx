import { Topic } from '@/lib/supabase'

interface TopicCardProps {
  topic: Topic
  onClick: (topicId: number) => void
}

export default function TopicCard({ topic, onClick }: TopicCardProps) {
  return (
    <div
      className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 hover:bg-gray-750 transition-all duration-200 cursor-pointer"
      onClick={() => onClick(topic.id)}
    >
      <h3 className="text-xl font-semibold mb-3 text-hubcap-accent">
        {topic.name}
      </h3>
      {topic.description && (
        <p className="text-gray-300 text-sm leading-relaxed">
          {topic.description}
        </p>
      )}
      <div className="mt-4 text-xs text-gray-500">
        Created {new Date(topic.created_at).toLocaleDateString()}
      </div>
    </div>
  )
}