'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'
import { useEffect, Suspense, useState } from 'react'
import { cn } from '@/lib/utils'
// custom theme management

/* ── icon helpers for business-type preset cards ── */
const PRESET_ICONS: Record<string, string> = {
  clothing: 'checkroom',
  food: 'restaurant',
  freelancer: 'person',
  digital: 'devices',
  coaching: 'school',
  general: 'category',
}

const TONE_OPTIONS = [
  { key: 'professional', name: 'Professional', icon: 'work' },
  { key: 'friendly', name: 'Friendly', icon: 'sentiment_satisfied' },
  { key: 'formal', name: 'Formal', icon: 'business' },
  { key: 'casual', name: 'Casual', icon: 'mood' },
  { key: 'warm', name: 'Warm', icon: 'wb_sunny' }
]

const STYLE_OPTIONS = [
  { key: 'concise', name: 'Concise', icon: 'short_text' },
  { key: 'detailed', name: 'Detailed', icon: 'notes' },
  { key: 'empathetic', name: 'Empathetic', icon: 'favorite' },
  { key: 'direct', name: 'Direct', icon: 'trending_flat' }
]

function SettingsContent() {
  const qc = useQueryClient()
  const { setGmailStatus, setReviewMode } = useSettingsStore()
  const searchParams = useSearchParams()

  const [ezenTheme, setEzenTheme] = useState<string>('vibrant-humanist')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('ezen-theme') || 'vibrant-humanist'
    setEzenTheme(stored)
  }, [])

  const handleThemeChange = (themeName: string) => {
    setEzenTheme(themeName)
    localStorage.setItem('ezen-theme', themeName)
    
    // Apply changes to document root
    document.documentElement.setAttribute('data-ezen-theme', themeName)
    if (themeName === 'zen-night' || themeName === 'electric-gen-z') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    toast.success(`Theme set to ${themeName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`)
  }

  const COLOR_PALETTES = [
    {
      key: 'vibrant-humanist',
      name: 'Vibrant Humanist',
      description: 'Human warmth & AI precision',
      preview: { surface: '#fff7fe', primary: '#714b67', secondary: '#006b5f', accent: '#faba72' }
    },
    {
      key: 'zen-night',
      name: 'Zen Night (Dark)',
      description: 'Deep focus, low strain',
      preview: { surface: '#1F1A22', primary: '#DFB7FF', secondary: '#4FDBC8', accent: '#6D4100' }
    },
    {
      key: 'stone-steel',
      name: 'Stone & Steel',
      description: 'Neutral & corporate',
      preview: { surface: '#f8f9fa', primary: '#343a40', secondary: '#6c757d', accent: '#adb5bd' }
    },
    {
      key: 'electric-gen-z',
      name: 'Electric Gen-Z',
      description: 'Cyberpunk contrast',
      preview: { surface: '#000000', primary: '#CCFF00', secondary: '#FF00FF', accent: '#00FFFF' }
    },
    {
      key: 'sunset-retro',
      name: 'Sunset Retro',
      description: 'Warm nostalgic tones',
      preview: { surface: '#FFF5E6', primary: '#FF6B35', secondary: '#F7C59F', accent: '#004E64' }
    }
  ]

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  })

  const { data: gmailStatus, isLoading: gmailLoading } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: () => api.get('/auth/gmail/status').then((r) => r.data),
  })

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['business-profile'],
    queryFn: () => api.get('/business/profile').then((r) => r.data),
  })

  const { data: fetchedPresets } = useQuery({
    queryKey: ['business-presets'],
    queryFn: () => api.get('/business/presets').then((r) => r.data),
  })

  const DEFAULT_PRESETS = [
    { type_key: 'clothing', name: 'Clothing & Products' },
    { type_key: 'food', name: 'Food & Cafe' },
    { type_key: 'freelancer', name: 'Freelancer / Services' },
    { type_key: 'digital', name: 'Digital Products' },
    { type_key: 'coaching', name: 'Coaching / Education' },
    { type_key: 'general', name: 'General (Default)' }
  ]

  const presets = fetchedPresets && fetchedPresets.length > 0 ? fetchedPresets : DEFAULT_PRESETS

  useEffect(() => {
    if (gmailStatus) setGmailStatus(gmailStatus.connected, gmailStatus.email)
    if (settings) setReviewMode(settings.review_mode)
  }, [gmailStatus, settings, setGmailStatus, setReviewMode])

  useEffect(() => {
    if (searchParams.get('gmail_connected') === 'true') {
      toast.success('Gmail connected successfully!')
      qc.invalidateQueries({ queryKey: ['gmail-status'] })
    }
    if (searchParams.get('error')) toast.error('Gmail connection failed. Please try again.')
  }, [searchParams, qc])

  const connectGmail = useMutation({
    mutationFn: () => api.get('/auth/gmail/connect').then((r) => r.data),
    onSuccess: (data) => { window.location.href = data.oauth_url },
    onError: () => toast.error('Failed to start Gmail connection'),
  })

  const disconnectGmail = useMutation({
    mutationFn: () => api.delete('/auth/gmail/disconnect'),
    onSuccess: () => { toast.success('Gmail disconnected'); qc.invalidateQueries({ queryKey: ['gmail-status'] }) },
    onError: () => toast.error('Failed to disconnect Gmail'),
  })

  const toggleReview = useMutation({
    mutationFn: (enabled: boolean) => api.patch('/settings/review-mode', { enabled }),
    onSuccess: (_, enabled) => {
      toast.success(`Review mode ${enabled ? 'enabled' : 'disabled'}`)
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || 'Failed to update review mode. Please try again.')
    },
  })

  const updateTone = useMutation({
    mutationFn: (tone: string) => api.patch('/business/profile/tone', { tone }),
    onSuccess: () => { toast.success('Tone updated'); qc.invalidateQueries({ queryKey: ['business-profile'] }) },
  })

  const updateStyle = useMutation({
    mutationFn: (style: string) => api.patch('/business/profile/style', { style }),
    onSuccess: () => { toast.success('Style updated'); qc.invalidateQueries({ queryKey: ['business-profile'] }) },
  })

  const updateType = useMutation({
    mutationFn: (type_key: string) => api.post('/business/profile/type', { type_key }),
    onSuccess: () => { toast.success('Business type updated'); qc.invalidateQueries({ queryKey: ['business-profile'] }) },
  })

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <header className="mb-12">
        <h2 className="font-heading text-[40px] font-bold text-ezen-primary scribble-underline">Settings</h2>
        <p className="text-ezen-on-surface-variant mt-2 text-sm">Manage your workspace and personal preferences.</p>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gmail Connection Section */}
        <section className="lg:col-span-7 bg-ezen-surface-container-lowest p-8 rounded-3xl border border-ezen-outline-variant/30 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-8 -right-8 bg-ezen-primary-fixed opacity-20 rounded-full blur-3xl w-40 h-40 pointer-events-none" />
          
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[#EA4335] rounded-xl flex items-center justify-center shadow-md shrink-0">
                <span className="material-symbols-outlined text-white text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>
              </div>
              <h3 className="font-heading text-xl font-bold text-ezen-primary">Gmail Connection</h3>
            </div>

            {gmailLoading ? (
              <Skeleton className="h-24 w-full rounded-2xl" />
            ) : (
              <div className="bg-ezen-surface-container-low p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 border border-ezen-outline-variant/30">
                <div className="flex items-center gap-4 min-w-0 w-full md:w-auto">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-ezen-outline-variant/30 shrink-0">
                    <img alt="Gmail" className="w-6 h-6" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCMhHiLdWosYnpNbsRh2MN7bzWVtV8tGb7dP_w0wqAU2RgFRyuyyTkhQ5Le4VPEqv4bWDFXgiIB7DFmpybEvYkNIkJtkbLxLEgYpz1ExNPsG_qXZZOA1hFx46CgLAxAnH88FfAwfPQLckOVrCp2ZE4o7VvDYse0ZNzH7lDsIXUWpuvjMp2mtbvdxqHRJTG_uylkc1Q6zSAVHUOfDqosnO0lpTKCRQEe_gBBGT4yKquYl8V-_H6bxnPR2EbuGXmAwgevAyrCfpkuMrU" />
                  </div>
                  <div className="min-w-0">
                    {gmailStatus?.connected ? (
                      <>
                        <p className="font-bold text-ezen-on-surface truncate text-sm">{gmailStatus.email}</p>
                        <p className="text-[11px] text-ezen-on-surface-variant mt-0.5">Connected since Oct 2023</p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-ezen-on-surface text-sm">Gmail disconnected</p>
                        <p className="text-[11px] text-ezen-on-surface-variant mt-0.5">Connect your inbox to start</p>
                      </>
                    )}
                  </div>
                </div>
                {gmailStatus?.connected ? (
                  <button
                    onClick={() => disconnectGmail.mutate()}
                    disabled={disconnectGmail.isPending}
                    className="px-5 py-2 border-2 border-ezen-error text-ezen-error font-bold rounded-full hover:bg-ezen-error hover:text-white transition-all active:scale-95 cursor-pointer shrink-0 text-xs"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => connectGmail.mutate()}
                    disabled={connectGmail.isPending}
                    className="px-5 py-2 border-2 border-ezen-primary text-ezen-primary font-bold rounded-full hover:bg-ezen-primary hover:text-ezen-on-primary transition-all active:scale-95 cursor-pointer shrink-0 text-xs"
                  >
                    Connect Gmail
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3 p-4 border border-dashed border-ezen-primary/30 rounded-2xl bg-ezen-primary-container/5">
            <span className="material-symbols-outlined text-ezen-primary shrink-0 text-[20px] mt-0.5">info</span>
            <p className="text-xs text-ezen-on-surface-variant leading-relaxed">
              Disconnecting will pause all AI automated responses and email categorization until a new account is linked.
            </p>
          </div>
        </section>

        {/* AI Theme Card */}
        <section className="lg:col-span-5 bg-ezen-surface-container-lowest p-8 rounded-3xl border border-ezen-outline-variant/30 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute bottom-0 left-0 bg-ezen-secondary-fixed opacity-20 rounded-full blur-2xl w-24 h-24 pointer-events-none -translate-x-1/2 translate-y-1/2" />

          <div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-ezen-primary-fixed/40 border border-ezen-primary-fixed-dim flex items-center justify-center shadow-sm shrink-0">
                <span className="material-symbols-outlined text-[22px] text-ezen-primary font-bold">brush</span>
              </div>
              <h3 className="font-heading text-xl font-bold text-ezen-primary">AI Theme</h3>
            </div>

            {profileLoading ? (
              <Skeleton className="h-48 w-full rounded-2xl" />
            ) : (
              <div className="grid grid-cols-12 gap-y-6 gap-x-4 items-center relative z-10 w-full">
                {/* Business Type Select */}
                <div className="col-span-5 sm:col-span-4">
                  <label className="text-[11px] sm:text-xs font-bold text-ezen-on-surface-variant uppercase tracking-wider block">
                    Business Type
                  </label>
                </div>
                <div className="col-span-7 sm:col-span-8">
                  <Select
                    value={profile?.preset_type_key ?? 'general'}
                    onValueChange={(v) => updateType.mutate(v)}
                  >
                    <SelectTrigger className="h-11 w-full border-2 border-ezen-outline-variant rounded-xl shadow-[2px_2px_0_0_#80747a] focus:shadow-none focus:border-ezen-primary bg-ezen-surface-container-lowest text-xs sm:text-sm capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-2 border-ezen-outline-variant bg-ezen-surface-container-lowest">
                      {presets.map((p: any) => (
                        <SelectItem key={p.type_key} value={p.type_key} className="text-xs sm:text-sm capitalize">
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tone Select */}
                <div className="col-span-5 sm:col-span-4">
                  <label className="text-[11px] sm:text-xs font-bold text-ezen-on-surface-variant uppercase tracking-wider block">
                    Tone
                  </label>
                </div>
                <div className="col-span-7 sm:col-span-8">
                  <Select
                    value={profile?.tone_override ?? 'friendly'}
                    onValueChange={(v) => updateTone.mutate(v)}
                  >
                    <SelectTrigger className="h-11 w-full border-2 border-ezen-outline-variant rounded-xl shadow-[2px_2px_0_0_#80747a] focus:shadow-none focus:border-ezen-primary bg-ezen-surface-container-lowest text-xs sm:text-sm capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-2 border-ezen-outline-variant bg-ezen-surface-container-lowest">
                      {TONE_OPTIONS.map((t) => (
                        <SelectItem key={t.key} value={t.key} className="text-xs sm:text-sm capitalize">
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Style Select */}
                <div className="col-span-5 sm:col-span-4">
                  <label className="text-[11px] sm:text-xs font-bold text-ezen-on-surface-variant uppercase tracking-wider block">
                    Style
                  </label>
                </div>
                <div className="col-span-7 sm:col-span-8">
                  <Select
                    value={profile?.style_override ?? 'concise'}
                    onValueChange={(v) => updateStyle.mutate(v)}
                  >
                    <SelectTrigger className="h-11 w-full border-2 border-ezen-outline-variant rounded-xl shadow-[2px_2px_0_0_#80747a] focus:shadow-none focus:border-ezen-primary bg-ezen-surface-container-lowest text-xs sm:text-sm capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-2 border-ezen-outline-variant bg-ezen-surface-container-lowest">
                      {STYLE_OPTIONS.map((s) => (
                        <SelectItem key={s.key} value={s.key} className="text-xs sm:text-sm capitalize">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Review Mode Section */}
        <section className="lg:col-span-5 bg-ezen-surface-container-lowest p-8 rounded-3xl border border-ezen-outline-variant/10 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-ezen-secondary rounded-xl flex items-center justify-center shadow-md shrink-0">
                <span className="material-symbols-outlined text-white text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>rate_review</span>
              </div>
              <h3 className="font-heading text-xl font-bold text-ezen-primary">Review Mode</h3>
            </div>
            <p className="text-sm text-ezen-on-surface-variant mb-8 leading-relaxed">
              When enabled, all AI-generated tickets and emails will require manual approval before being sent to customers.
            </p>
          </div>
          <div className="flex items-center justify-between p-4 bg-ezen-surface-container-low rounded-2xl border border-ezen-outline-variant/10">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-ezen-on-surface">Enable Manual Review</span>
              <span className="px-2 py-0.5 bg-ezen-secondary-container text-ezen-on-secondary-container text-[10px] font-bold rounded-full">Recommended</span>
            </div>
            <Switch
              checked={settings?.review_mode ?? false}
              onCheckedChange={(v) => toggleReview.mutate(v)}
              disabled={toggleReview.isPending}
            />
          </div>
        </section>

        {/* Appearance Card */}
        <section className="lg:col-span-7 bg-ezen-surface-container-lowest p-8 rounded-3xl border border-ezen-outline-variant/10 shadow-sm relative pb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-ezen-primary/10 rounded-xl flex items-center justify-center shadow-sm shrink-0 text-ezen-primary">
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>palette</span>
            </div>
            <div>
              <h3 className="font-heading text-xl font-bold text-ezen-primary">Workspace Appearance</h3>
              <p className="text-[11px] text-ezen-on-surface-variant font-sans mt-0.5">Select a custom color theme system to refresh your Ezen interface.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {COLOR_PALETTES.map((palette) => {
              const isActiveTheme = mounted && ezenTheme === palette.key
              return (
                <button
                  key={palette.key}
                  onClick={() => handleThemeChange(palette.key)}
                  className={cn(
                    "flex flex-col items-start text-left p-4 rounded-2xl border-2 transition-all cursor-pointer w-full font-sans group hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden",
                    isActiveTheme
                      ? "border-ezen-primary bg-ezen-surface-container-low shadow-sm"
                      : "border-ezen-outline-variant/40 bg-white hover:border-ezen-primary/40"
                  )}
                >
                  <div className="flex justify-between items-center w-full mb-3">
                    <span className="font-bold text-sm text-ezen-on-surface">{palette.name}</span>
                    {isActiveTheme && (
                      <span className="material-symbols-outlined text-xs text-ezen-primary bg-ezen-primary/10 p-0.5 rounded-full shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check
                      </span>
                    )}
                  </div>
                  
                  {/* Color dots preview bar */}
                  <div className="flex gap-2 mb-3">
                    <span className="w-4 h-4 rounded-full border border-ezen-outline-variant/50" style={{ backgroundColor: palette.preview.surface }} title="Surface" />
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: palette.preview.primary }} title="Primary" />
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: palette.preview.secondary }} title="Secondary" />
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: palette.preview.accent }} title="Accent" />
                  </div>

                  <p className="text-[10px] text-ezen-outline leading-tight">{palette.description}</p>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      {/* Footer Actions */}
      <footer className="mt-16 pt-8 border-t border-ezen-outline-variant/20 flex justify-end gap-4">
        <button
          onClick={() => {
            qc.invalidateQueries()
            toast.info('Changes discarded')
          }}
          className="px-8 py-3 text-ezen-primary font-bold hover:bg-ezen-primary/5 rounded-full transition-colors cursor-pointer text-sm"
        >
          Discard Changes
        </button>
        <button
          onClick={() => {
            toast.success('Preferences saved successfully!')
          }}
          className="px-10 py-3 bg-ezen-primary text-ezen-on-primary font-bold rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer text-sm"
        >
          Save Preferences
        </button>
      </footer>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-3xl" />)}</div>}>
      <SettingsContent />
    </Suspense>
  )
}
