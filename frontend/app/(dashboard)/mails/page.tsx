'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Textarea } from '@/components/ui/textarea'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { TimeAgo } from '@/components/time-ago'
import { cn } from '@/lib/utils'

export default function MailsPage() {
  const qc = useQueryClient()
  const setQueueCount = useSettingsStore((s) => s.setQueueCount)
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'review' | 'history'>('review')
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [composeAIInstructions, setComposeAIInstructions] = useState('')
  const [isGeneratingComposed, setIsGeneratingComposed] = useState(false)

  const [itemInstructions, setItemInstructions] = useState<Record<string, string>>({})
  const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({})

  const handleSendCompose = async () => {
    if (!composeTo || !composeSubject || !composeBody) {
      toast.error('Please fill in all fields')
      return
    }

    setIsSending(true)
    try {
      await api.post('/send-email', {
        to_email: composeTo,
        subject: composeSubject,
        body: composeBody
      })
      toast.success('Email sent successfully')
      setComposeTo('')
      setComposeSubject('')
      setComposeBody('')
      setComposeAIInstructions('')
      setIsComposeOpen(false)
      qc.invalidateQueries({ queryKey: ['tickets'] })
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to send email'
      toast.error(msg)
    } finally {
      setIsSending(false)
    }
  }

  const handleGenerateComposedEmail = async () => {
    if (!composeSubject || !composeAIInstructions) {
      toast.error('Please fill in Subject and AI Instructions')
      return
    }

    setIsGeneratingComposed(true)
    try {
      const response = await api.post('/generate-composed', {
        subject: composeSubject,
        instructions: composeAIInstructions,
        to_email: composeTo || null
      })

      const generatedText = response.data.body
      if (generatedText) {
        setComposeBody(generatedText)
        toast.success('AI draft written!')
      } else {
        toast.error('Failed to generate AI email body')
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to generate email'
      toast.error(msg)
    } finally {
      setIsGeneratingComposed(false)
    }
  }

  const handleGenerateForQueueItem = async (itemId: string, ticketId: string) => {
    if (!ticketId) {
      toast.error('No ticket associated with this item')
      return
    }

    setIsGenerating(prev => ({ ...prev, [itemId]: true }))
    try {
      const response = await api.post(`/tickets/${ticketId}/generate-reply`, {
        instructions: itemInstructions[itemId] || ''
      })

      const newReply = response.data.reply_body
      if (newReply) {
        setEditing(prev => ({ ...prev, [itemId]: newReply }))
        toast.success('AI reply generated!')
      } else {
        toast.error('Failed to generate AI reply')
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to generate AI reply'
      toast.error(msg)
    } finally {
      setIsGenerating(prev => ({ ...prev, [itemId]: false }))
    }
  }

  const { data: queue = [], isLoading: queueLoading } = useQuery({
    queryKey: ['queue'],
    queryFn: () => api.get('/queue').then((r) => r.data),
    refetchInterval: 10000,
  })

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api.get('/tickets').then((r) => r.data),
  })

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  })

  const emailsUsed = settings?.emails_used ?? 0
  const rawLimit = settings?.emails_limit ?? 50
  const emailsLimit = rawLimit === 999999999 ? Infinity : rawLimit
  const usagePercent = emailsLimit > 0 && emailsLimit !== Infinity
    ? Math.min((emailsUsed / emailsLimit) * 100, 100)
    : 0

  useEffect(() => { setQueueCount(queue.length) }, [queue.length, setQueueCount])

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/queue/${id}/approve`),
    onSuccess: () => { toast.success('Reply sent'); qc.invalidateQueries({ queryKey: ['queue'] }); qc.invalidateQueries({ queryKey: ['tickets'] }) },
    onError: () => toast.error('Failed to send'),
  })
  const reject = useMutation({
    mutationFn: (id: string) => api.post(`/queue/${id}/reject`),
    onSuccess: () => { toast.success('Mail rejected'); qc.invalidateQueries({ queryKey: ['queue'] }); qc.invalidateQueries({ queryKey: ['tickets'] }) },
    onError: () => toast.error('Failed to reject'),
  })
  const editAndSend = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api.post(`/queue/${id}/edit`, { body }),
    onSuccess: () => { toast.success('Edited reply sent'); qc.invalidateQueries({ queryKey: ['queue'] }); qc.invalidateQueries({ queryKey: ['tickets'] }) },
    onError: () => toast.error('Failed to send'),
  })
  const saveDraft = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api.post(`/queue/${id}/draft`, { body }),
    onSuccess: () => { toast.success('Draft saved'); qc.invalidateQueries({ queryKey: ['queue'] }); qc.invalidateQueries({ queryKey: ['tickets'] }) },
    onError: () => toast.error('Failed to save draft'),
  })

  const history = tickets

  /** Extract initials from sender name or email */
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/)
      return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].substring(0, 2).toUpperCase()
    }
    if (email) return email.substring(0, 2).toUpperCase()
    return '??'
  }

  // Resolution → style mapping (Ezen design tokens)
  const resolutionStyle = (resolution: string | null | undefined) => {
    switch (resolution) {
      case 'approved':
      case 'auto_sent':
        return {
          bg: 'bg-ezen-secondary-container/20 border-ezen-secondary/30',
          icon: <span className="material-symbols-outlined text-base text-ezen-secondary">check_circle</span>,
          label: <span className="text-xs text-ezen-secondary font-semibold">Sent</span>,
        }
      case 'edited_and_sent':
        return {
          bg: 'bg-ezen-tertiary-fixed/30 border-ezen-tertiary/30',
          icon: <span className="material-symbols-outlined text-base text-ezen-tertiary">edit_note</span>,
          label: <span className="text-xs text-ezen-tertiary font-semibold">Edited &amp; Sent</span>,
        }
      case 'rejected':
        return {
          bg: 'bg-ezen-error-container/40 border-ezen-error/30',
          icon: <span className="material-symbols-outlined text-base text-ezen-error">cancel</span>,
          label: <span className="text-xs text-ezen-error font-semibold">Rejected</span>,
        }
      default:
        return {
          bg: 'bg-ezen-surface-container border-ezen-outline-variant',
          icon: <span className="material-symbols-outlined text-base text-ezen-outline">schedule</span>,
          label: <span className="text-xs text-ezen-outline font-medium">Pending</span>,
        }
    }
  }

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }))
  }

  /** Skeleton loader matching Ezen card style */
  const QueueSkeleton = () => (
    <div className="bg-ezen-surface border border-ezen-outline-variant rounded-3xl p-6 animate-pulse space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-ezen-surface-container-high" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-ezen-surface-container-high rounded-full w-1/3" />
          <div className="h-3 bg-ezen-surface-container-high rounded-full w-1/4" />
        </div>
      </div>
      <div className="h-20 bg-ezen-surface-container-high rounded-2xl" />
      <div className="h-32 bg-ezen-surface-container-high rounded-2xl" />
    </div>
  )

  const HistorySkeleton = () => (
    <div className="bg-ezen-surface border border-ezen-outline-variant rounded-3xl p-5 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-ezen-surface-container-high" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-ezen-surface-container-high rounded-full w-2/5" />
          <div className="h-3 bg-ezen-surface-container-high rounded-full w-1/4" />
        </div>
        <div className="h-6 w-16 bg-ezen-surface-container-high rounded-full" />
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-[40px] font-bold text-ezen-on-background leading-tight">
            <span className="scribble-underline">Mail Queue</span>
          </h1>
          <button
            onClick={() => setIsComposeOpen(true)}
            className="bg-ezen-primary text-white hover:bg-ezen-primary/95 p-2.5 rounded-full shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer inline-flex items-center justify-center shrink-0"
            title="Compose Email"
          >
            <span className="material-symbols-outlined text-lg leading-none">edit</span>
          </button>
        </div>

        {/* Segmented Tab Control */}
        <div className="bg-ezen-surface-container-low p-1 rounded-full border border-ezen-outline-variant/50 inline-flex">
          <button
            onClick={() => setActiveTab('review')}
            className={cn(
              'px-5 py-2 text-sm font-medium rounded-full transition-all duration-200',
              activeTab === 'review'
                ? 'bg-ezen-surface shadow-md border border-ezen-outline-variant/30 text-ezen-primary font-semibold'
                : 'text-ezen-on-surface-variant hover:text-ezen-on-surface'
            )}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">rate_review</span>
              Review Mode
              {queue.length > 0 && (
                <span className="bg-ezen-error text-ezen-on-error text-xs rounded-full px-2 py-0.5 font-bold min-w-[22px] text-center">
                  {queue.length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'px-5 py-2 text-sm font-medium rounded-full transition-all duration-200',
              activeTab === 'history'
                ? 'bg-ezen-surface shadow-md border border-ezen-outline-variant/30 text-ezen-primary font-semibold'
                : 'text-ezen-on-surface-variant hover:text-ezen-on-surface'
            )}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">history</span>
              History
              <span className="text-xs text-ezen-outline">({history.length})</span>
            </span>
          </button>
        </div>
      </div>

      {/* ===== Compose Mail Modal ===== */}
      {isComposeOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-ezen-surface border-2 border-ezen-outline-variant rounded-[2rem] p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative space-y-5">
            <button
              onClick={() => setIsComposeOpen(false)}
              className="absolute top-5 right-5 text-ezen-outline hover:text-ezen-primary font-bold text-lg cursor-pointer"
            >
              &times;
            </button>

            <div className="flex items-center gap-2 pb-3 border-b border-ezen-outline-variant/30">
              <span className="material-symbols-outlined text-ezen-primary text-xl">edit_square</span>
              <h2 className="font-heading text-lg font-bold text-ezen-on-surface">Compose New Email</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ezen-on-surface-variant uppercase tracking-wider">Recipient Email</label>
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full bg-ezen-surface-bright border border-ezen-outline-variant rounded-2xl px-4 py-2.5 text-sm text-ezen-on-surface focus:outline-none focus:border-ezen-primary/45 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ezen-on-surface-variant uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Support inquiry reply..."
                  className="w-full bg-ezen-surface-bright border border-ezen-outline-variant rounded-2xl px-4 py-2.5 text-sm text-ezen-on-surface focus:outline-none focus:border-ezen-primary/45 transition-colors"
                />
              </div>
            </div>

            {/* AI Generator Helper Option */}
            <div className="bg-ezen-surface-container-low border border-ezen-outline-variant/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-ezen-primary">
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                <span className="text-xs font-bold uppercase tracking-wider">Draft with AI</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={composeAIInstructions}
                  onChange={(e) => setComposeAIInstructions(e.target.value)}
                  placeholder="Briefly describe what you want to say..."
                  className="flex-1 bg-ezen-surface-bright border border-ezen-outline-variant rounded-xl px-3 py-2 text-xs text-ezen-on-surface focus:outline-none focus:border-ezen-primary/45 transition-colors"
                />
                <button
                  onClick={handleGenerateComposedEmail}
                  disabled={isGeneratingComposed || !composeSubject || !composeAIInstructions}
                  className="bg-ezen-primary text-white hover:bg-ezen-primary/95 disabled:opacity-50 px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0 transition-all duration-200"
                >
                  {isGeneratingComposed ? (
                    <>
                      <span className="animate-spin size-3.5 border-2 border-white border-t-transparent rounded-full" />
                      Drafting...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">auto_awesome</span>
                      Generate
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-ezen-outline font-semibold">
                Requires Subject and brief instructions to generate.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ezen-on-surface-variant uppercase tracking-wider">Message Body</label>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Type your message here, or generate it using the AI option above..."
                className="bg-ezen-surface-bright rounded-2xl shadow-inner min-h-[160px] border-ezen-outline-variant text-sm text-ezen-on-surface focus-visible:ring-ezen-primary/30 focus-visible:ring-offset-0 p-4"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsComposeOpen(false)}
                className="text-ezen-on-surface-variant hover:text-ezen-on-surface text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendCompose}
                disabled={isSending || !composeTo || !composeSubject || !composeBody}
                className="bg-ezen-primary text-white hover:bg-ezen-primary/95 disabled:opacity-50 shadow-md rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-200 inline-flex items-center gap-2 cursor-pointer"
              >
                {isSending ? (
                  <>
                    <span className="animate-spin size-4 border-2 border-white border-t-transparent rounded-full" />
                    Sending...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">send</span>
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ──────────── Review Mode Tab ──────────── */}
      {activeTab === 'review' && (
        <div className="max-w-4xl mx-auto space-y-4">
          {queueLoading ? (
            [...Array(3)].map((_, i) => <QueueSkeleton key={i} />)
          ) : queue.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-full bg-ezen-surface-container-high flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl text-ezen-outline">inbox</span>
              </div>
              <h3 className="font-heading text-xl font-semibold text-ezen-on-surface mb-2">All caught up!</h3>
              <p className="text-sm text-ezen-on-surface-variant max-w-sm">
                No pending mails in the approval queue. New emails will appear here when they arrive.
              </p>
            </div>
          ) : queue.map((item: any) => {
            const isEditing = item.id in editing
            const isExpanded = !!expandedItems[item.id]

            return (
              <div
                key={item.id}
                className="bg-ezen-surface border border-ezen-outline-variant rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Collapsed Header (Always Visible) */}
                <div
                  onClick={() => toggleExpand(item.id)}
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-ezen-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Avatar Initials */}
                    <div className="w-10 h-10 rounded-full bg-ezen-tertiary-container text-ezen-on-tertiary-container border border-ezen-tertiary/40 flex items-center justify-center text-xs font-bold shrink-0">
                      {getInitials(item.sender_name, item.sender_email)}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-ezen-on-surface truncate">
                          {item.reply_subject ?? item.subject}
                        </p>
                        {item.sentiment && (
                          <span className="bg-ezen-error-container/60 text-ezen-on-error-container rounded-full px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-0.5 scale-90 shrink-0">
                            <span className="material-symbols-outlined text-[10px]">sentiment_dissatisfied</span>
                            {item.sentiment}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ezen-on-surface-variant truncate mt-0.5">
                        from {item.sender_name || item.sender_email?.split('@')[0] || 'Unknown'} ({item.sender_email})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {item.created_at && (
                      <TimeAgo date={item.created_at} className="text-xs text-ezen-outline" />
                    )}
                    <span className={cn(
                      "material-symbols-outlined text-ezen-outline transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )}>
                      keyboard_arrow_down
                    </span>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-6 pt-0 border-t border-ezen-outline-variant/30 space-y-5">
                    {/* Original Email Section ("mail I got") */}
                    <div className="mt-5">
                      <p className="text-xs font-medium text-ezen-on-surface-variant mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">mail</span>
                        Original Email Received
                      </p>
                      <div className="bg-ezen-surface-container-lowest rounded-2xl p-4 border border-ezen-outline-variant/50 max-h-40 overflow-y-auto text-sm text-ezen-on-surface-variant whitespace-pre-wrap leading-relaxed">
                        {item.original_body ?? item.body ?? 'No email body available.'}
                      </div>
                    </div>

                    {/* AI Draft Section ("mail I generated") */}
                    <div>
                      <p className="text-xs font-medium text-ezen-on-surface-variant mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-ezen-secondary-fixed-dim animate-pulse"></span>
                        AI Generated Draft Response
                      </p>
                      {isEditing ? (
                        <Textarea
                          value={editing[item.id]}
                          onChange={(e) => setEditing((p) => ({ ...p, [item.id]: e.target.value }))}
                          className="bg-ezen-surface-bright rounded-2xl shadow-inner min-h-[200px] border-ezen-outline-variant text-sm text-ezen-on-surface focus-visible:ring-ezen-primary/30 focus-visible:ring-offset-0 p-4"
                        />
                      ) : (
                        <div className="bg-ezen-surface-bright rounded-2xl shadow-inner min-h-[120px] border border-ezen-outline-variant p-4 text-sm text-ezen-on-surface whitespace-pre-wrap leading-relaxed">
                          {item.edited_reply_body ?? item.original_reply_body ?? item.ai_reply ?? 'No reply generated yet.'}
                        </div>
                      )}
                    </div>

                    {/* AI Refinement / Regeneration */}
                    <div className="bg-ezen-surface-container-low border border-ezen-outline-variant/30 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-1.5 text-ezen-primary">
                        <span className="material-symbols-outlined text-base">auto_awesome</span>
                        <span className="text-xs font-bold uppercase tracking-wider">Refine with AI</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={itemInstructions[item.id] || ''}
                          onChange={(e) => setItemInstructions(prev => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="Provide instructions to generate/regenerate reply (e.g., Ask for order ID, apologize for delay)"
                          className="flex-1 bg-ezen-surface-bright border border-ezen-outline-variant rounded-xl px-3 py-2.5 text-xs text-ezen-on-surface focus:outline-none focus:border-ezen-primary/45 transition-colors"
                        />
                        <button
                          onClick={() => handleGenerateForQueueItem(item.id, item.ticket_id)}
                          disabled={isGenerating[item.id] || !item.ticket_id}
                          className="bg-ezen-primary text-white hover:bg-ezen-primary/95 disabled:opacity-50 px-4 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                        >
                          {isGenerating[item.id] ? (
                            <>
                              <span className="animate-spin size-3.5 border-2 border-white border-t-transparent rounded-full" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm">auto_awesome</span>
                              Generate
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-ezen-outline-variant/30">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => setEditing((p) => { const n = { ...p }; delete n[item.id]; return n })}
                            className="text-ezen-on-surface-variant hover:text-ezen-on-surface text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              saveDraft.mutate({ id: item.id, body: editing[item.id] })
                              setEditing((p) => { const n = { ...p }; delete n[item.id]; return n })
                            }}
                            disabled={saveDraft.isPending}
                            className="border border-ezen-primary text-ezen-primary hover:bg-ezen-primary/5 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-lg">save</span>
                            Save Draft
                          </button>
                          <button
                            onClick={() => {
                              editAndSend.mutate({ id: item.id, body: editing[item.id] })
                              setEditing((p) => { const n = { ...p }; delete n[item.id]; return n })
                            }}
                            disabled={editAndSend.isPending}
                            className="bg-ezen-primary text-ezen-on-primary hover:bg-ezen-primary-container shadow-md rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-lg">send</span>
                            Send Edited
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => reject.mutate(item.id)}
                            disabled={reject.isPending}
                            className="text-ezen-error hover:bg-ezen-error-container/50 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-lg">close</span>
                            Reject
                          </button>
                          <button
                            onClick={() => setEditing((p) => ({ ...p, [item.id]: item.edited_reply_body ?? item.original_reply_body ?? item.ai_reply ?? '' }))}
                            className="border border-ezen-primary text-ezen-primary hover:bg-ezen-primary/5 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors inline-flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                            Edit &amp; Save
                          </button>
                          <button
                            onClick={() => approve.mutate(item.id)}
                            disabled={approve.isPending}
                            className="bg-ezen-primary text-ezen-on-primary hover:bg-ezen-primary-container shadow-md rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-lg">send</span>
                            Approve &amp; Send
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ──────────── History Tab ──────────── */}
      {activeTab === 'history' && (
        <div className="max-w-4xl mx-auto space-y-4">
          {ticketsLoading ? (
            [...Array(3)].map((_, i) => <HistorySkeleton key={i} />)
          ) : history.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-full bg-ezen-surface-container-high flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl text-ezen-outline">folder_open</span>
              </div>
              <h3 className="font-heading text-xl font-semibold text-ezen-on-surface mb-2">No history yet</h3>
              <p className="text-sm text-ezen-on-surface-variant max-w-sm">
                Processed emails will appear here once you start reviewing them.
              </p>
            </div>
          ) : history.map((ticket: any) => (
            <HistoryItem
              key={ticket.id}
              ticket={ticket}
              getInitials={getInitials}
              resolutionStyle={resolutionStyle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function HistoryItem({ ticket, getInitials, resolutionStyle }: { ticket: any; getInitials: any; resolutionStyle: any }) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Lazy load ticket details when expanded to display body content
  const { data: details, isLoading } = useQuery({
    queryKey: ['ticket', ticket.id],
    queryFn: () => api.get(`/tickets/${ticket.id}`).then((r) => r.data),
    enabled: isExpanded,
  })

  const style = resolutionStyle(ticket.resolution)

  const inboundMessage = details?.messages?.find((m: any) => m.direction === 'inbound')?.body
  const outboundMessage = details?.messages?.find((m: any) => m.direction === 'outbound')?.body

  return (
    <div
      className={cn(
        'rounded-3xl border transition-all duration-200 overflow-hidden',
        style.bg
      )}
    >
      {/* Header (Always Visible) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-ezen-surface-container-low/30 transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-ezen-surface-container-high text-ezen-on-surface-variant border border-ezen-outline-variant/40 flex items-center justify-center text-xs font-bold shrink-0">
            {getInitials(ticket.sender_name, ticket.sender_email)}
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-ezen-on-surface truncate">{ticket.subject}</p>
              <div className="flex items-center gap-1.5 shrink-0 bg-ezen-surface/80 rounded-full px-2.5 py-0.5 border border-ezen-outline-variant/30 scale-90">
                {style.icon}
                {style.label}
              </div>
            </div>
            <p className="text-xs text-ezen-on-surface-variant mt-0.5 truncate">{ticket.sender_email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          {ticket.created_at && (
            <TimeAgo date={ticket.created_at} className="text-xs text-ezen-outline" />
          )}
          <span className={cn(
            "material-symbols-outlined text-ezen-outline transition-transform duration-200",
            isExpanded && "rotate-180"
          )}>
            keyboard_arrow_down
          </span>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-6 pt-0 border-t border-ezen-outline-variant/20 space-y-4 bg-ezen-surface-bright/20">
          {isLoading ? (
            <div className="space-y-3 pt-4 animate-pulse">
              <div className="h-4 bg-ezen-surface-container-high rounded-full w-1/4" />
              <div className="h-16 bg-ezen-surface-container-high rounded-2xl" />
              <div className="h-4 bg-ezen-surface-container-high rounded-full w-1/4" />
              <div className="h-16 bg-ezen-surface-container-high rounded-2xl" />
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              {/* Mail Got */}
              <div>
                <p className="text-xs font-semibold text-ezen-on-surface-variant mb-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">mail</span>
                  Mail Got (Inbound)
                </p>
                <div className="bg-ezen-surface-container-lowest/80 rounded-2xl p-4 border border-ezen-outline-variant/30 max-h-40 overflow-y-auto text-xs text-ezen-on-surface-variant whitespace-pre-wrap leading-relaxed">
                  {inboundMessage || 'No incoming message found.'}
                </div>
              </div>

              {/* Mail Generated */}
              <div>
                <p className="text-xs font-semibold text-ezen-on-surface-variant mb-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  Mail Generated (Outbound)
                </p>
                <div className="bg-ezen-surface-container-lowest/80 rounded-2xl p-4 border border-ezen-outline-variant/30 max-h-40 overflow-y-auto text-xs text-ezen-on-surface-variant whitespace-pre-wrap leading-relaxed">
                  {outboundMessage || 'No outgoing reply was sent.'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
