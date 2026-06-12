'use client'

import { formatDistanceToNow } from 'date-fns'

export function TimeAgo({ date, className }: { date: string; className?: string }) {
  return (
    <span suppressHydrationWarning className={className}>
      {formatDistanceToNow(new Date(date), { addSuffix: true })}
    </span>
  )
}
