'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const STEPS = ['Business Type', 'Connect Gmail', 'Done']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [selectedType, setSelectedType] = useState('')

  const { data: fetchedPresets } = useQuery({
    queryKey: ['business-presets'],
    queryFn: () => api.get('/business/presets').then((r) => r.data),
  })

  const DEFAULT_PRESETS = [
    { type_key: 'clothing', name: 'Clothing & Products', description: 'Apparel, footwear, fashion accessories' },
    { type_key: 'food', name: 'Food & Cafe', description: 'Restaurants, bars, coffee shops, delivery' },
    { type_key: 'freelancer', name: 'Freelancer / Services', description: 'Consultants, software builders, designers' },
    { type_key: 'digital', name: 'Digital Products', description: 'Software, eBooks, courses, PDFs' },
    { type_key: 'coaching', name: 'Coaching / Education', description: 'Personal trainers, tutors, academies' },
    { type_key: 'general', name: 'General (Default)', description: 'General customer inquiries and complaints' }
  ]

  const presets = fetchedPresets && fetchedPresets.length > 0 ? fetchedPresets : DEFAULT_PRESETS

  const { data: gmailStatus } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: () => api.get('/auth/gmail/status').then((r) => r.data),
    enabled: step === 1,
  })

  const setType = useMutation({
    mutationFn: (type_key: string) => api.post('/business/profile/type', { type_key }),
    onSuccess: () => setStep(1),
    onError: () => toast.error('Failed to set business type'),
  })

  const connectGmail = useMutation({
    mutationFn: () => api.get('/auth/gmail/connect').then((r) => r.data),
    onSuccess: (data) => { window.location.href = data.oauth_url },
    onError: () => toast.error('Failed to start Gmail connection'),
  })

  const complete = useMutation({
    mutationFn: () => api.post('/business/profile/complete-onboarding'),
    onSuccess: () => router.push('/dashboard'),
    onError: () => toast.error('Failed to complete onboarding'),
  })

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ezen-background p-6">
      <div className="w-full max-w-lg space-y-8">
        {/* Logo/Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-ezen-primary flex items-center justify-center text-ezen-on-primary font-heading font-extrabold text-2xl shadow-[4px_4px_0_0_#ffd7f1]">
            E
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-ezen-primary">Welcome to Ezen AI</h1>
          <p className="text-sm text-ezen-outline">Let's get your support intelligence set up.</p>
        </div>

        {/* Progress Stepper */}
        <div className="flex items-center justify-between px-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    i < step
                      ? 'bg-ezen-secondary text-ezen-on-secondary border-2 border-ezen-secondary shadow-[2px_2px_0_0_#006a65]'
                      : i === step
                      ? 'bg-ezen-primary text-ezen-on-primary border-2 border-ezen-primary shadow-[2px_2px_0_0_#57344f]'
                      : 'bg-ezen-surface-dim border-2 border-ezen-outline-variant text-ezen-outline'
                  )}
                >
                  {i < step ? (
                    <span className="material-symbols-outlined text-base font-bold">check</span>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-heading font-bold hidden sm:inline',
                    i === step ? 'text-ezen-primary font-extrabold' : 'text-ezen-outline'
                  )}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 bg-ezen-outline-variant/60 mx-2 min-w-[20px]" />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Business Type */}
        {step === 0 && (
          <div className="bg-ezen-surface border-2 border-ezen-outline-variant rounded-3xl p-8 shadow-[6px_6px_0_0_#d1c3ca] space-y-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-ezen-primary" style={{ fontSize: 28 }}>
                business_center
              </span>
              <h2 className="font-heading text-xl font-bold text-ezen-on-surface">What type of business are you?</h2>
            </div>
            <p className="text-sm text-ezen-on-surface-variant">
              Select your business sector. This helps our AI tone builder adopt presets optimized for your industry.
            </p>
            <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {presets.map((p: any) => (
                <button
                  key={p.type_key}
                  onClick={() => setSelectedType(p.type_key)}
                  className={cn(
                    'p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-1 cursor-pointer',
                    selectedType === p.type_key
                      ? 'border-ezen-primary bg-ezen-primary-container/10 shadow-[3px_3px_0_0_#57344f]'
                      : 'border-ezen-outline-variant hover:border-ezen-primary/50 hover:bg-ezen-surface-container-low/40 bg-ezen-surface-container-lowest'
                  )}
                >
                  <span className="font-heading font-extrabold text-ezen-primary capitalize">{p.name}</span>
                  {p.description && <p className="text-xs text-ezen-on-surface-variant">{p.description}</p>}
                </button>
              ))}
            </div>
            <button
              disabled={!selectedType || setType.isPending}
              onClick={() => setType.mutate(selectedType)}
              className="w-full bg-ezen-primary hover:bg-ezen-primary-container text-ezen-on-primary rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-all shadow-[4px_4px_0_0_#000000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-bold text-sm cursor-pointer disabled:opacity-50"
            >
              Continue <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        )}

        {/* Step 1: Connect Gmail */}
        {step === 1 && (
          <div className="bg-ezen-surface border-2 border-ezen-outline-variant rounded-3xl p-8 shadow-[6px_6px_0_0_#d1c3ca] space-y-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-ezen-primary" style={{ fontSize: 28 }}>
                mail
              </span>
              <h2 className="font-heading text-xl font-bold text-ezen-on-surface">Connect your support email</h2>
            </div>
            <p className="text-sm text-ezen-on-surface-variant">
              Connect your Gmail account. Ezen AI needs permissions to read support requests and draft replies.
            </p>

            {gmailStatus?.connected ? (
              <div className="flex items-center gap-3 p-4 bg-ezen-secondary-container/10 border-2 border-ezen-secondary rounded-2xl">
                <span className="material-symbols-outlined text-ezen-secondary">check_circle</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ezen-outline">Connected Support Email</p>
                  <p className="text-sm font-semibold text-ezen-on-surface truncate">{gmailStatus.email}</p>
                </div>
                <span className="bg-ezen-secondary text-ezen-on-secondary px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Active
                </span>
              </div>
            ) : (
              <button
                onClick={() => connectGmail.mutate()}
                disabled={connectGmail.isPending}
                className="w-full border-2 border-ezen-primary hover:bg-ezen-primary-container/5 text-ezen-primary rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-all font-bold text-sm cursor-pointer disabled:opacity-50 shadow-[3px_3px_0_0_#57344f] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
              >
                <span className="material-symbols-outlined text-base">link</span> Connect Gmail Account
              </button>
            )}

            <button
              onClick={() => complete.mutate()}
              disabled={complete.isPending}
              className="w-full bg-ezen-primary hover:bg-ezen-primary-container text-ezen-on-primary rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-all shadow-[4px_4px_0_0_#000000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-bold text-sm cursor-pointer disabled:opacity-50"
            >
              {gmailStatus?.connected ? 'Finish Setup' : 'Skip for now'}
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
