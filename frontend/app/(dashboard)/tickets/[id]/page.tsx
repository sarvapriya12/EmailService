'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import Link from 'next/link'
import { use, useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const qc = useQueryClient()
  const [replyBody, setReplyBody] = useState<string>('')

  const sendManualReplyMutation = useMutation({
    mutationFn: (body: string) => api.post(`/tickets/${id}/reply`, { body }),
    onSuccess: () => {
      toast.success('Reply sent successfully!')
      setReplyBody('')
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
    onError: (err: any) => {
      console.error(err)
      toast.error('Failed to send reply')
    },
  })

  const generateAIReplyMutation = useMutation({
    mutationFn: (instructions?: string) => api.post(`/tickets/${id}/generate-reply`, { instructions }).then((r) => r.data),
    onSuccess: (data: any) => {
      toast.success('AI reply generated!')
      setReplyBody(data.reply_body)
    },
    onError: (err: any) => {
      console.error(err)
      toast.error('Failed to generate AI reply')
    },
  })

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.get(`/tickets/${id}`).then((r) => r.data),
  })

  useEffect(() => {
    if (ticket?.pending_reply) {
      setReplyBody(ticket.pending_reply.edited_reply_body ?? ticket.pending_reply.original_reply_body)
    }
  }, [ticket?.pending_reply])

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/tickets/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Ticket status updated')
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const approve = useMutation({
    mutationFn: (queueId: string) => api.post(`/queue/${queueId}/approve`),
    onSuccess: () => {
      toast.success('AI reply approved and sent!')
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
    onError: () => toast.error('Failed to approve reply'),
  })

  const reject = useMutation({
    mutationFn: (queueId: string) => api.post(`/queue/${queueId}/reject`),
    onSuccess: () => {
      toast.success('AI reply rejected and deleted.')
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
    onError: () => toast.error('Failed to reject reply'),
  })

  const editAndSend = useMutation({
    mutationFn: ({ queueId, body }: { queueId: string; body: string }) => api.post(`/queue/${queueId}/edit`, { body }),
    onSuccess: () => {
      toast.success('Edited reply sent successfully!')
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
    onError: () => toast.error('Failed to send edited reply'),
  })

  const saveDraft = useMutation({
    mutationFn: ({ queueId, body }: { queueId: string; body: string }) => api.post(`/queue/${queueId}/draft`, { body }),
    onSuccess: () => {
      toast.success('Draft saved successfully!')
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
    onError: () => toast.error('Failed to save draft'),
  })

  /* ── Status color map ── */
  const STATUS_COLORS: Record<string, string> = {
    open: 'bg-ezen-secondary/10 text-ezen-secondary border-ezen-secondary/20',
    in_progress: 'bg-ezen-tertiary-fixed/40 text-ezen-tertiary border-ezen-tertiary-fixed-dim/30',
    resolved: 'bg-ezen-secondary-fixed/30 text-ezen-secondary border-ezen-secondary-fixed-dim/30',
    closed: 'bg-ezen-surface-container-high text-ezen-on-surface-variant border-ezen-outline-variant',
  }

  /* ── Loading skeleton ── */
  if (isLoading) return (
    <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
      {/* Top bar skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 bg-ezen-surface-container-high rounded-lg" />
        <div className="flex items-center gap-3">
          <div className="h-9 w-36 bg-ezen-surface-container-high rounded-xl" />
          <div className="h-6 w-20 bg-ezen-surface-container-high rounded-full" />
        </div>
      </div>
      {/* Header skeleton */}
      <div className="bg-ezen-surface-container-lowest border border-ezen-outline-variant rounded-3xl p-8 space-y-3">
        <div className="h-9 w-3/4 bg-ezen-surface-container-high rounded-xl" />
        <div className="h-5 w-1/3 bg-ezen-surface-container-high rounded-lg" />
      </div>
      {/* Messages skeleton */}
      <div className="space-y-5">
        <div className="flex gap-3 max-w-[70%]">
          <div className="w-12 h-12 bg-ezen-surface-container-high rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-20 bg-ezen-surface-container-high rounded-full" />
            <div className="h-24 bg-ezen-surface-container-high rounded-2xl rounded-tl-none" />
          </div>
        </div>
        <div className="flex gap-3 max-w-[70%] ml-auto flex-row-reverse">
          <div className="w-12 h-12 bg-ezen-surface-container-high rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-16 bg-ezen-surface-container-high rounded-full ml-auto" />
            <div className="h-20 bg-ezen-surface-container-high rounded-2xl rounded-tr-none" />
          </div>
        </div>
      </div>
    </div>
  )

  /* ── Not found state ── */
  if (!ticket) return (
    <div className="text-center py-20 max-w-4xl mx-auto space-y-6">
      <div className="w-20 h-20 mx-auto bg-ezen-surface-container rounded-3xl flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-ezen-outline">search_off</span>
      </div>
      <div className="space-y-2">
        <p className="font-heading text-xl font-semibold text-ezen-on-surface">Ticket not found</p>
        <p className="text-sm text-ezen-on-surface-variant">This ticket may have been deleted or the URL is incorrect.</p>
      </div>
      <Link
        href="/tickets"
        className="inline-flex items-center gap-2 text-sm font-semibold text-ezen-primary hover:text-ezen-primary-container transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back to tickets
      </Link>
    </div>
  )

  /* ── Helper: extract initials from email ── */
  const getInitials = (email: string) => {
    const name = email.split('@')[0]
    return name.substring(0, 2).toUpperCase()
  }

  /* ── Helper: render message list ── */
  const renderMessageList = (messagesList: any[], senderEmail: string, compact: boolean = false) => {
    if (!messagesList || messagesList.length === 0) {
      return (
        <div className="text-center py-12 border-2 border-dashed border-ezen-outline-variant rounded-2xl">
          <span className="material-symbols-outlined text-3xl text-ezen-outline-variant mb-2 block">forum</span>
          <p className="text-sm text-ezen-on-surface-variant">No message history found for this ticket.</p>
        </div>
      )
    }

    return (
      <div className={cn("space-y-6", compact && "space-y-4")}>
        {messagesList.map((message: any) => {
          const isInbound = message.direction === 'inbound'
          const isHumanEdited = !isInbound && message.edited_by_human
          const isAIReply = !isInbound && !isHumanEdited && !message.is_draft

          return (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 max-w-[85%]",
                isInbound ? "mr-auto" : "ml-auto flex-row-reverse",
                compact && "gap-2"
              )}
            >
              {/* Avatar */}
              {compact ? (
                message.is_draft ? (
                  <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white text-xs">auto_awesome</span>
                  </div>
                ) : isInbound ? (
                  <div className="w-8 h-8 rounded-xl bg-ezen-secondary-fixed-dim flex items-center justify-center shrink-0 text-xs font-bold text-ezen-on-secondary-container">
                    {getInitials(senderEmail)}
                  </div>
                ) : isAIReply ? (
                  <div className="w-8 h-8 rounded-xl bg-ezen-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-ezen-on-primary text-xs">smart_toy</span>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-ezen-tertiary-fixed flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-ezen-tertiary text-xs">person</span>
                  </div>
                )
              ) : (
                message.is_draft ? (
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white text-xl">auto_awesome</span>
                  </div>
                ) : isInbound ? (
                  <div className="w-12 h-12 rounded-2xl bg-ezen-secondary-fixed-dim flex items-center justify-center shrink-0 text-sm font-bold text-ezen-on-secondary-container">
                    {getInitials(senderEmail)}
                  </div>
                ) : isAIReply ? (
                  <div className="w-12 h-12 rounded-2xl bg-ezen-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-ezen-on-primary text-xl">smart_toy</span>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-ezen-tertiary-fixed flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-ezen-tertiary text-xl">person</span>
                  </div>
                )
              )}

              {/* Message content */}
              <div className={cn("space-y-1.5 min-w-0 flex-1", !isInbound && "flex flex-col items-end")}>
                {/* Badge */}
                <div className={cn("flex items-center gap-2", !isInbound && "flex-row-reverse")}>
                  {message.is_draft ? (
                    <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full px-2 py-0.5 text-[10px] font-semibold inline-flex items-center gap-1 animate-pulse">
                      <span className="material-symbols-outlined text-[10px]">pending</span>
                      AI Draft (Pending Approval)
                    </span>
                  ) : isInbound ? (
                    <span className="bg-ezen-secondary-container text-ezen-on-secondary-container rounded-full px-2 py-0.5 text-[10px] font-medium">
                      Customer
                    </span>
                  ) : isAIReply ? (
                    <span className="bg-ezen-primary-container text-ezen-on-primary-container rounded-full px-2 py-0.5 text-[10px] font-medium inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                      Ezen AI
                    </span>
                  ) : (
                    <span className="bg-ezen-tertiary-fixed text-ezen-tertiary rounded-full px-2 py-0.5 text-[10px] font-medium inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">edit</span>
                      Human Edited
                    </span>
                  )}
                  {message.created_at && (
                    <span className="text-[10px] text-ezen-outline">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    "text-sm leading-relaxed whitespace-pre-wrap break-words relative p-4 rounded-2xl",
                    message.is_draft
                      ? "bg-amber-500/5 border border-amber-400 border-dashed rounded-tr-none text-ezen-on-surface"
                      : isInbound
                        ? "bg-ezen-surface-container-lowest border border-ezen-outline-variant rounded-tl-none text-ezen-on-surface"
                        : isAIReply
                          ? "bg-ezen-primary/5 border border-ezen-primary/20 rounded-tr-none text-ezen-on-surface"
                          : "bg-ezen-tertiary-fixed/10 border-2 border-dashed border-ezen-tertiary-fixed-dim/40 rounded-tr-none text-ezen-on-surface"
                  )}
                >
                  {message.body || <span className="italic text-ezen-outline-variant">Draft is empty...</span>}
                  {/* AI watermark */}
                  {(isAIReply || message.is_draft) && !compact && (
                    <span className="material-symbols-outlined absolute bottom-2 right-2 text-ezen-primary/10 text-3xl pointer-events-none select-none">
                      auto_awesome
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  /* ── Helper: Render manual/AI reply composer ── */
  const renderReplyComposer = () => {
    const isPendingReply = !!ticket.pending_reply

    const handleApproveOrSend = () => {
      if (!replyBody.trim() || !ticket.pending_reply) return
      const currentDraftBody = ticket.pending_reply.edited_reply_body ?? ticket.pending_reply.original_reply_body
      if (replyBody === currentDraftBody) {
        approve.mutate(ticket.pending_reply.id)
      } else {
        editAndSend.mutate({ queueId: ticket.pending_reply.id, body: replyBody })
      }
    }

    return (
      <div className="bg-ezen-surface border-2 border-ezen-outline-variant rounded-3xl shadow-[4px_4px_0_0_#d1c3ca] overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-ezen-outline-variant pb-3">
          {isPendingReply ? (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-xl animate-pulse">auto_awesome</span>
              <div>
                <h3 className="text-sm font-semibold text-ezen-on-surface font-heading">AI Response Draft</h3>
                <p className="text-xs text-ezen-on-surface-variant">Review, edit, or approve the AI response below.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-ezen-primary text-xl">reply</span>
              <h3 className="text-sm font-semibold text-ezen-on-surface font-heading">Compose Reply</h3>
            </div>
          )}

          {!isPendingReply && (
            <button
              onClick={() => generateAIReplyMutation.mutate(replyBody)}
              disabled={generateAIReplyMutation.isPending}
              className="bg-ezen-primary/10 text-ezen-primary hover:bg-ezen-primary/20 disabled:opacity-50 transition-colors px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              {generateAIReplyMutation.isPending ? 'Generating...' : 'Generate with AI'}
            </button>
          )}
        </div>

        <Textarea
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          rows={6}
          className="bg-ezen-surface-bright rounded-2xl shadow-inner min-h-[150px] text-sm border-ezen-outline-variant focus-visible:ring-ezen-primary p-4 leading-relaxed w-full resize-y"
          placeholder={isPendingReply ? "Edit the AI response draft here..." : "Type your manual response here, or click 'Generate with AI' to draft one..."}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {isPendingReply ? (
            <>
              {/* Left aligned: Reject */}
              <button
                className="text-ezen-error hover:bg-ezen-error-container/50 border border-transparent hover:border-ezen-error rounded-xl px-4 py-2 font-semibold text-sm inline-flex items-center gap-2 transition-all disabled:opacity-50"
                onClick={() => reject.mutate(ticket.pending_reply.id)}
                disabled={reject.isPending}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                Reject Draft
              </button>

              {/* Right aligned: Save Draft & Approve/Send */}
              <div className="flex items-center gap-3 ml-auto">
                <button
                  className="border border-ezen-primary text-ezen-primary hover:bg-ezen-primary/5 rounded-xl px-5 py-2 font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-50 transition-colors"
                  onClick={() => saveDraft.mutate({ queueId: ticket.pending_reply.id, body: replyBody })}
                  disabled={saveDraft.isPending || !replyBody.trim()}
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Save Draft
                </button>
                <button
                  className="bg-ezen-primary text-ezen-on-primary rounded-xl px-6 py-2 shadow-md font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                  onClick={handleApproveOrSend}
                  disabled={approve.isPending || editAndSend.isPending || !replyBody.trim()}
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  {approve.isPending || editAndSend.isPending ? 'Sending...' : 'Approve & Send'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-end gap-3 w-full">
              {replyBody && (
                <button
                  className="border border-ezen-outline-variant text-ezen-on-surface-variant hover:bg-ezen-surface-container rounded-xl px-5 py-2 font-semibold text-sm transition-colors"
                  onClick={() => setReplyBody('')}
                >
                  Clear
                </button>
              )}
              <button
                className="bg-ezen-primary text-ezen-on-primary hover:opacity-90 disabled:opacity-50 rounded-xl px-6 py-2 shadow-md font-semibold text-sm inline-flex items-center gap-2 transition-opacity"
                onClick={() => sendManualReplyMutation.mutate(replyBody)}
                disabled={sendManualReplyMutation.isPending || !replyBody.trim()}
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                {sendManualReplyMutation.isPending ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const currentMessages = [...(ticket.messages || [])]
  if (ticket.pending_reply) {
    currentMessages.push({
      id: `draft-${ticket.pending_reply.id}`,
      direction: 'outbound',
      body: replyBody,
      is_draft: true,
      created_at: new Date().toISOString()
    })
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">

      {/* ═══ Top Bar ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/tickets"
            className="inline-flex items-center gap-1.5 text-sm text-ezen-on-surface-variant hover:text-ezen-primary transition-colors font-medium"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back
          </Link>
          <span className="text-ezen-outline-variant">·</span>
          <span className="bg-ezen-surface-container text-ezen-on-surface-variant text-xs font-semibold rounded-full px-3 py-1 font-mono tracking-wide">
            #{id.slice(0, 8)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn(
            "capitalize px-3 py-1 text-xs font-semibold border rounded-full inline-flex items-center gap-1.5",
            STATUS_COLORS[ticket.status]
          )}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {ticket.status?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {ticket.previous_ticket ? (
        /* ═══ SPLIT SCREEN VIEW FOR EXTENSION TICKETS (WITHIN 24H) ═══ */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* LEFT COLUMN: Previous Ticket Conversation */}
          <div className="bg-ezen-surface-container-lowest border-2 border-ezen-outline-variant rounded-3xl p-6 space-y-6 shadow-sm max-h-[85vh] overflow-y-auto">
            <div className="border-b border-ezen-outline-variant pb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-ezen-primary-container text-ezen-on-primary-container text-[10px] font-bold rounded-full px-2.5 py-0.5 tracking-wide inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">history</span>
                  EXTENSION (PREVIOUS TICKET)
                </span>
                <span className="bg-ezen-surface-container text-ezen-on-surface-variant text-[10px] font-semibold rounded-full px-2.5 py-0.5 font-mono">
                  #{ticket.previous_ticket.id.slice(0, 8)}
                </span>
              </div>
              <h2 className="font-heading text-lg font-bold text-ezen-on-surface leading-snug">
                {ticket.previous_ticket.subject}
              </h2>
              <p className="text-xs text-ezen-on-surface-variant mt-1">
                Created {formatDistanceToNow(new Date(ticket.previous_ticket.created_at), { addSuffix: true })}
              </p>
            </div>
            
            {renderMessageList(ticket.previous_ticket.messages, ticket.sender_email, true)}
          </div>

          {/* RIGHT COLUMN: Current Ticket (Latest Message & Reply) */}
          <div className="space-y-6">
            <div className="bg-ezen-surface-container-lowest border-2 border-ezen-outline-variant rounded-3xl p-6 space-y-4 shadow-sm">
              <div className="border-b border-ezen-outline-variant pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-ezen-secondary-container text-ezen-on-secondary-container text-[10px] font-bold rounded-full px-2.5 py-0.5 tracking-wide inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">mail</span>
                    LATEST EMAIL
                  </span>
                </div>
                <h2 className="font-heading text-lg font-bold text-ezen-on-surface leading-snug">
                  {ticket.subject}
                </h2>
              </div>
              
              {renderMessageList(currentMessages, ticket.sender_email, false)}
            </div>

            {renderReplyComposer()}
          </div>
        </div>
      ) : (
        /* ═══ NORMAL SINGLE COLUMN VIEW ═══ */
        <div className="space-y-8">
          {/* Conversation Header */}
          <div className="relative">
            <div className="space-y-2">
              <h1 className="font-heading text-[32px] font-semibold text-ezen-on-surface leading-tight">
                <span className="scribble-underline">{ticket.subject}</span>
              </h1>
              <p className="text-sm text-ezen-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">mail</span>
                From <span className="font-medium text-ezen-on-surface">{ticket.sender_email}</span>
                {ticket.created_at && (
                  <>
                    <span className="text-ezen-outline-variant">·</span>
                    <span className="text-ezen-outline">
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </span>
                  </>
                )}
              </p>
            </div>
            {/* Decorative scribble arrow */}
            <div className="absolute -right-2 top-0 hidden lg:block pointer-events-none select-none">
              <svg width="120" height="60" viewBox="0 0 120 60" fill="none" className="text-ezen-primary/20">
                <path d="M10,50 Q60,0 110,30" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                <polygon points="108,25 115,32 105,32" fill="currentColor" />
              </svg>
              <span className="absolute -bottom-1 right-0 text-[10px] font-heading font-semibold text-ezen-primary/30 rotate-3">
                thread ✦
              </span>
            </div>
          </div>

          {/* Message Thread */}
          {renderMessageList(currentMessages, ticket.sender_email, false)}

          {/* Reply Composer */}
          {renderReplyComposer()}
        </div>
      )}
    </div>
  )
}
