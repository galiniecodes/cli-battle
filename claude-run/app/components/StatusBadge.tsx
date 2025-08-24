import { Status } from '@prisma/client'

interface StatusBadgeProps {
  status: Status
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusStyle = () => {
    switch (status) {
      case 'DONE':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'CALLING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'ESCALATED':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'RETRYING':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle()}`}>
      {status}
    </span>
  )
}