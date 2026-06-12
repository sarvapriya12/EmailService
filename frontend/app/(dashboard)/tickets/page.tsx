'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { TimeAgo } from '@/components/time-ago'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  open: 'default',
  in_progress: 'outline',
  resolved: 'secondary',
  closed: 'secondary',
}

/** Ezen-styled status badge classes per status value */
const STATUS_BADGE_STYLES: Record<string, string> = {
  open: 'bg-ezen-secondary-container text-ezen-secondary border-2 border-ezen-secondary shadow-[2px_2px_0_0_var(--ezen-secondary)]',
  in_progress:
    'bg-ezen-tertiary-fixed text-ezen-tertiary border-2 border-ezen-tertiary shadow-[2px_2px_0_0_var(--ezen-tertiary)]',
  resolved:
    'bg-ezen-primary-container/20 text-ezen-primary border-2 border-ezen-primary shadow-[2px_2px_0_0_var(--ezen-primary)]',
  closed:
    'bg-ezen-surface-container-high text-ezen-outline border-2 border-ezen-outline shadow-[2px_2px_0_0_var(--ezen-outline)]',
}

type FilterTab = 'all' | 'unassigned' | 'high'

export default function TicketsPage() {
  const qc = useQueryClient()
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api.get('/tickets').then((r) => r.data),
  })

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/tickets/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  })

  /* ---- helpers ---- */
  const getInitials = (email: string) =>
    (email ?? '??').slice(0, 2).toUpperCase()

  const filteredTickets = tickets.filter((ticket: any) => {
    if (activeFilter === 'unassigned') return !ticket.assigned_to
    if (activeFilter === 'high') return ticket.priority === 'high'
    return true
  })

  /* ---- render ---- */
  return (
    <div className="space-y-8">
      {/* ===== Page Header ===== */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        {/* Title + subtitle */}
        <div>
          <h1 className="font-heading text-[40px] font-bold leading-tight text-ezen-on-background">
            <span className="scribble-underline">Ticket Inbox</span>
          </h1>
          <p className="mt-2 text-base text-ezen-outline">
            Manage and resolve incoming support requests.
          </p>
        </div>

        {/* Segmented filter control */}
        <div className="flex items-center gap-1 rounded-xl border-2 border-ezen-outline-variant bg-ezen-surface-container-low p-1 shadow-[4px_4px_0_0_var(--ezen-outline-variant)]">
          {([
            { key: 'all', label: 'All Tickets' },
            { key: 'unassigned', label: 'Unassigned' },
            { key: 'high', label: 'High Priority' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm transition-all',
                activeFilter === key
                  ? 'bg-ezen-surface font-medium text-ezen-primary shadow-sm'
                  : 'text-ezen-on-surface-variant hover:text-ezen-on-surface'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== Ticket List Table ===== */}
      <div className="overflow-hidden rounded-xl border-2 border-ezen-outline-variant bg-ezen-surface-container-lowest shadow-[6px_6px_0_0_var(--ezen-outline-variant)]">
        {/* Table header */}
        <div className="grid grid-cols-[40px_2fr_3fr_1fr_1fr] items-center border-b-2 border-ezen-outline-variant bg-ezen-surface-bright/50 px-6 py-3">
          <div>
            {/* Checkbox placeholder */}
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-2 border-ezen-outline-variant accent-ezen-primary"
              aria-label="Select all tickets"
            />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-ezen-outline">
            Sender
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-ezen-outline">
            Subject
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-ezen-outline">
            Received
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-ezen-outline">
            Status
          </span>
        </div>

        {/* Table body */}
        {isLoading ? (
          <div className="divide-y-2 divide-ezen-outline-variant">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[40px_2fr_3fr_1fr_1fr] items-center px-6 py-4"
              >
                <div className="h-4 w-4 animate-pulse rounded bg-ezen-surface-container-high" />
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-ezen-surface-container-high" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-32 animate-pulse rounded bg-ezen-surface-container-high" />
                    <div className="h-2.5 w-20 animate-pulse rounded bg-ezen-surface-container-high" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-48 animate-pulse rounded bg-ezen-surface-container-high" />
                  <div className="h-2.5 w-64 animate-pulse rounded bg-ezen-surface-container-high" />
                </div>
                <div className="h-3 w-20 animate-pulse rounded bg-ezen-surface-container-high" />
                <div className="h-7 w-24 animate-pulse rounded-lg bg-ezen-surface-container-high" />
              </div>
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <span className="material-symbols-outlined text-5xl text-ezen-outline-variant">
              inbox
            </span>
            <p className="text-sm text-ezen-outline">No tickets found.</p>
          </div>
        ) : (
          <div className="divide-y-2 divide-ezen-outline-variant">
            {filteredTickets.map((ticket: any) => (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                className="grid grid-cols-[40px_2fr_3fr_1fr_1fr] items-center px-6 py-4 transition-colors hover:bg-ezen-surface-container-low"
              >
                {/* Checkbox */}
                <div onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-2 border-ezen-outline-variant accent-ezen-primary"
                    aria-label={`Select ticket from ${ticket.sender_email}`}
                  />
                </div>

                {/* Sender */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ezen-primary-fixed text-xs font-semibold text-ezen-primary">
                    {getInitials(ticket.sender_email)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ezen-on-surface">
                      {ticket.sender_email}
                    </p>
                    {ticket.sender_company && (
                      <p className="truncate text-xs text-ezen-outline">
                        {ticket.sender_company}
                      </p>
                    )}
                  </div>
                </div>

                {/* Subject + body preview */}
                <div className="min-w-0 pr-4">
                  <p className="truncate text-sm font-semibold text-ezen-on-surface">
                    {ticket.subject}
                  </p>
                  {ticket.body && (
                    <p className="mt-0.5 truncate text-xs text-ezen-outline">
                      {ticket.body}
                    </p>
                  )}
                </div>

                {/* Received */}
                <div>
                  {ticket.created_at ? (
                    <TimeAgo
                      date={ticket.created_at}
                      className="text-xs text-ezen-on-surface-variant"
                    />
                  ) : (
                    <span className="text-xs text-ezen-outline">—</span>
                  )}
                </div>

                {/* Status */}
                <div>
                  <span
                    className={cn(
                      'capitalize px-3 py-1 text-xs font-semibold border rounded-full inline-flex items-center gap-1.5',
                      ticket.status === 'open' && 'bg-ezen-secondary/10 text-ezen-secondary border-ezen-secondary/20',
                      ticket.status === 'in_progress' && 'bg-ezen-tertiary-fixed/40 text-ezen-tertiary border-ezen-tertiary-fixed-dim/30',
                      ticket.status === 'resolved' && 'bg-ezen-secondary-fixed/30 text-ezen-secondary border-ezen-secondary-fixed-dim/30'
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {ticket.status?.replace('_', ' ')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ===== Pagination Footer ===== */}
        {!isLoading && filteredTickets.length > 0 && (
          <div className="flex items-center justify-between border-t-2 border-ezen-outline-variant bg-ezen-surface-bright/30 px-6 py-4">
            <p className="text-sm text-ezen-on-surface-variant">
              Showing{' '}
              <span className="font-medium text-ezen-on-surface">
                1–{filteredTickets.length}
              </span>{' '}
              of{' '}
              <span className="font-medium text-ezen-on-surface">
                {filteredTickets.length}
              </span>{' '}
              tickets
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ezen-outline-variant text-ezen-outline transition-colors hover:bg-ezen-surface-container-low disabled:opacity-40"
                aria-label="Previous page"
              >
                <span className="material-symbols-outlined text-[18px]">
                  chevron_left
                </span>
              </button>
              <button
                disabled
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ezen-outline-variant text-ezen-outline transition-colors hover:bg-ezen-surface-container-low disabled:opacity-40"
                aria-label="Next page"
              >
                <span className="material-symbols-outlined text-[18px]">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
