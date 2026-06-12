'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/useAuthStore'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

type CheckoutState =
  | 'LOADING'
  | 'QR_GENERATED'
  | 'QR_EXPIRED'
  | 'PAYMENT_COMPLETED'
  | 'PAYMENT_FAILED'
  | 'ERROR'

const PLAN_DETAILS: Record<string, { name: string; price: string; displayPrice: string; limit: number; features: string[] }> = {
  pro: { 
    name: 'Pro Plan', 
    price: '₹399/mo', 
    displayPrice: '₹399/mo',
    limit: 500, 
    features: [
      '500 emails/month premium capacity',
      'Advanced AI response generation',
      'Priority human-like support options',
      'Detailed dashboard & stats analytics'
    ] 
  },
  pro_yearly: { 
    name: 'Pro Plan (Yearly)', 
    price: '₹4309/year', 
    displayPrice: '₹4309/year',
    limit: 500, 
    features: [
      '500 emails/month premium capacity',
      'Advanced AI response generation',
      'Priority human-like support options',
      'Detailed dashboard & stats analytics',
      '10% annual savings discount applied'
    ] 
  },
  enterprise: { 
    name: 'Enterprise Plan', 
    price: '₹899/mo', 
    displayPrice: '₹899/mo',
    limit: 1500, 
    features: [
      '1500 emails/month scale capacity',
      'Custom AI behavior presets & training',
      'Top priority support assistance',
      'Advanced filters & whitelists/blacklists'
    ] 
  },
  enterprise_yearly: { 
    name: 'Enterprise Plan (Yearly)', 
    price: '₹9709/year', 
    displayPrice: '₹9709/year',
    limit: 1500, 
    features: [
      '1500 emails/month scale capacity',
      'Custom AI behavior presets & training',
      'Top priority support assistance',
      'Advanced filters & whitelists/blacklists',
      '10% annual savings discount applied'
    ] 
  }
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = useAuthStore((s) => s.user)
  
  const planId = searchParams.get('plan') || ''
  const plan = PLAN_DETAILS[planId.toLowerCase()]
  
  const [state, setState] = useState<CheckoutState>('LOADING')
  const [intentId, setIntentId] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string>('')
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutes
  const [errorMessage, setErrorMessage] = useState('')
  const [isSimulating, setIsSimulating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Get or Create Idempotency Key
  const getOrCreateIdempotencyKey = (plan: string): string => {
    if (typeof window === 'undefined') return ''
    const storageKey = `idem_${user?.id}_${plan}`
    let key = sessionStorage.getItem(storageKey)
    if (!key) {
      key = `${plan}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      sessionStorage.setItem(storageKey, key)
    }
    return key
  }

  // Initialize Payment Intent
  const createIntent = async () => {
    if (!user || !planId) return
    setState('LOADING')
    setErrorMessage('')
    
    try {
      const idempotencyKey = getOrCreateIdempotencyKey(planId)
      const redirectUrl = `${window.location.origin}/pricing`
      
      const res = await api.post(
        '/payments/checkout/create-intent',
        { plan_id: planId, redirect_url: redirectUrl },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      )
      
      const data = res.data
      setIntentId(data.intent_id)
      setQrUrl(data.qr_code_base64 || data.upi_link || data.qr_payload)
      setState('QR_GENERATED')
      setTimeLeft(120)
    } catch (err: any) {
      console.error('Checkout intent initiation failed:', err)
      setState('ERROR')
      setErrorMessage(
        err.response?.data?.detail || err.message || 'Failed to initialize checkout. Please try again.'
      )
    }
  }

  useEffect(() => {
    if (mounted && user && planId) {
      if (!plan) {
        setState('ERROR')
        setErrorMessage('Invalid plan specified.')
        return
      }
      createIntent()
    } else if (mounted && !user) {
      toast.error('Please login to proceed.')
      router.push('/login')
    }
    
    return () => {
      stopTimer()
      stopPolling()
    }
  }, [mounted, user, planId])

  // Timer Effect
  useEffect(() => {
    if (state === 'QR_GENERATED') {
      stopTimer()
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopTimer()
            setState('QR_EXPIRED')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      stopTimer()
    }
    return () => stopTimer()
  }, [state])

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // Status Polling Effect
  useEffect(() => {
    if (state === 'QR_GENERATED') {
      stopPolling()
      if (!intentId) return
      
      pollingRef.current = setInterval(async () => {
        try {
          const res = await api.get(`/payments/checkout/${intentId}/status`)
          const data = res.data
          
          if (data.payment_status === 'COMPLETED' || data.status === 'COMPLETED') {
            stopPolling()
            stopTimer()
            setState('PAYMENT_COMPLETED')
            toast.success('Payment successfully verified!')
            setTimeout(() => {
              router.push('/pricing')
            }, 3000)
          } else if (data.payment_status === 'FAILED' || data.status === 'FAILED') {
            stopPolling()
            stopTimer()
            setState('PAYMENT_FAILED')
          } else if (data.payment_status === 'EXPIRED' || data.status === 'EXPIRED') {
            stopPolling()
            stopTimer()
            setState('QR_EXPIRED')
          }
        } catch (err) {
          console.error('Error polling status:', err)
        }
      }, 2000)
    } else {
      stopPolling()
    }
    return () => stopPolling()
  }, [state, intentId])

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const handleCopyLink = () => {
    if (qrUrl) {
      navigator.clipboard.writeText(qrUrl)
      setIsCopying(true)
      toast.success('UPI Payment Link copied!')
      setTimeout(() => setIsCopying(false), 2000)
    }
  }

  const handleSimulateSuccess = async () => {
    if (!intentId) return
    setIsSimulating(true)
    try {
      await api.post('/payments/checkout/simulate-success', { intent_id: intentId })
      toast.success('Simulation payload submitted!')
    } catch (err: any) {
      toast.error('Simulation failed: ' + (err.response?.data?.detail || err.message))
    } finally {
      setIsSimulating(false)
    }
  }

  const handleResetCheckout = () => {
    if (typeof window !== 'undefined' && planId) {
      sessionStorage.removeItem(`idem_${user?.id}_${planId}`)
    }
    createIntent()
  }

  if (!mounted) return null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="checkout-scoped-theme relative w-full pb-12">
      <style jsx global>{`
        .scribble-arrow {
          position: absolute;
          top: -20px;
          right: -60px;
          width: 80px;
          transform: rotate(15deg);
          opacity: 0.8;
          pointer-events: none;
        }
        .custom-shadow {
          box-shadow: 0 4px 24px -1px rgba(113, 75, 103, 0.05);
        }
      `}</style>

      <main className="pt-8 pb-12 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Plan Summary */}
          <div className="md:col-span-5 space-y-8">
            <div>
              <Link 
                href="/pricing" 
                className="inline-flex items-center gap-2 text-ezen-primary font-bold hover:underline mb-4 group"
              >
                <span 
                  className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-1" 
                  style={{ fontVariationSettings: "'FILL' 0, 'wght' 700" }}
                >
                  arrow_back
                </span>
                Back to Pricing
              </Link>
              <h1 className="text-4xl font-extrabold text-ezen-primary font-heading tracking-tight">
                Your Humanist Upgrade
              </h1>
              <p className="text-lg text-ezen-on-surface-variant mt-2 font-sans">
                Elevate your inbox with intelligent workflows.
              </p>
            </div>

            {/* Plan Card */}
            {plan && (
              <div className="p-6 bg-ezen-surface-container-low border border-[#E2D5DE] rounded-2xl custom-shadow">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-ezen-primary font-heading capitalize">{plan.name}</h2>
                    <p className="text-sm text-ezen-on-surface-variant font-sans">Monthly Subscription</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-ezen-primary font-heading">{plan.price}</div>
                    <span className="text-[10px] bg-ezen-tertiary-fixed text-ezen-on-tertiary-fixed px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                </div>
                <div className="space-y-4 pt-6 border-t border-ezen-outline-variant/40">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-teal-600" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                      <span className="text-sm font-sans text-ezen-on-surface">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 p-4 bg-ezen-surface-container-highest rounded-2xl border border-ezen-outline-variant/30">
              <span className="material-symbols-outlined text-ezen-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
              <p className="text-xs italic text-ezen-on-surface-variant leading-relaxed">
                "Ezen transformed how I manage my professional network. It feels truly human." — Alex R., CTO
              </p>
            </div>
          </div>

          {/* Right Column: Payment Card */}
          <div className="md:col-span-7 flex justify-center lg:justify-end">
            <div className="bg-white p-8 sm:p-10 rounded-[2rem] border border-[#E2D5DE] custom-shadow max-w-md w-full relative">
              {/* Scribble Arrow */}
              <div className="scribble-arrow hidden lg:block">
                <svg fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 80C25 75 40 40 85 20" stroke="#714B67" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round"></path>
                  <path d="M75 15L87 20L82 32" stroke="#714B67" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>

              {state === 'LOADING' && (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="w-12 h-12 border-4 border-ezen-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-bold text-ezen-on-surface-variant">Generating secure transaction...</p>
                </div>
              )}

              {state === 'ERROR' && (
                <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                  <span className="material-symbols-outlined text-red-500" style={{ fontSize: '48px' }}>
                    error
                  </span>
                  <h3 className="font-heading text-lg font-bold text-ezen-on-surface">Initialization Failed</h3>
                  <p className="text-xs text-red-600 font-semibold">{errorMessage}</p>
                  <button
                    onClick={createIntent}
                    className="mt-4 px-6 py-2 bg-ezen-primary text-white font-bold rounded-full hover:bg-ezen-primary/95 transition-all cursor-pointer shadow-md"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {state === 'QR_GENERATED' && (
                <div className="text-center space-y-6">
                  <h2 className="text-2xl font-bold font-heading text-ezen-primary">Scan to Pay</h2>
                  
                  <div className="relative inline-block mx-auto">
                    {/* QR Container */}
                    <div className="bg-[#F9F7F8] p-6 rounded-2xl border-2 border-dashed border-ezen-outline-variant relative">
                      <img 
                        alt="Secure Payment QR Code" 
                        className="w-48 h-48 mix-blend-multiply select-none" 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
                      />
                      {/* Small branding in QR center */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-white p-1 rounded-lg border border-ezen-primary/20">
                          <div className="w-8 h-8 bg-ezen-primary rounded flex items-center justify-center">
                            <span className="text-white text-[10px] font-black font-heading">E</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Timer Badge */}
                    <div className={cn(
                      "absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-md transition-colors duration-300",
                      timeLeft < 30 ? "bg-ezen-error-container text-ezen-on-error-container" : "bg-ezen-primary-container text-white"
                    )}>
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 0" }}>
                        schedule
                      </span>
                      <span className="font-heading text-base font-extrabold tracking-wider">
                        {formatTime(timeLeft)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-6 space-y-2">
                    <p className="text-sm font-medium text-ezen-on-background">
                      Scan the QR code with any <span className="font-bold text-ezen-primary">UPI app</span> to complete your purchase.
                    </p>
                    <div className="flex justify-center gap-3 opacity-60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ezen-outline">GPay</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ezen-outline">PhonePe</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ezen-outline">Paytm</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ezen-outline">BHIM</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <button 
                      onClick={handleCopyLink}
                      className={cn(
                        "w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 group cursor-pointer shadow-md",
                        isCopying 
                          ? "bg-teal-600 text-white" 
                          : "bg-ezen-primary-container text-white hover:bg-ezen-primary-container/95 active:scale-95"
                      )}
                    >
                      <span className="material-symbols-outlined group-hover:rotate-12 transition-transform" style={{ fontSize: '18px' }}>
                        {isCopying ? 'check' : 'content_copy'}
                      </span>
                      {isCopying ? 'Copied!' : 'Copy UPI Link'}
                    </button>

                    <button 
                      disabled
                      className="w-full bg-ezen-surface-container-high text-ezen-outline/50 py-3.5 rounded-xl font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        refresh
                      </span>
                      Generate New QR
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-4">
                    <span className="material-symbols-outlined text-teal-600 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      lock
                    </span>
                    <span className="text-[10px] text-ezen-on-surface-variant font-bold tracking-wider uppercase">
                      SECURE DIRECT UPI PAYMENT
                    </span>
                  </div>

                  {/* Dev Simulation Helper */}
                  <div className="mt-4 border border-dashed border-ezen-secondary/30 bg-ezen-surface-container-low rounded-2xl p-4 space-y-2.5">
                    <p className="text-xs font-semibold text-ezen-secondary flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-xs">science</span>
                      Developer Test Sandbox
                    </p>
                    <p className="text-[10px] text-ezen-outline leading-normal font-sans">
                      Simulate a live callback webhook to approve this checkout instantly.
                    </p>
                    <button
                      onClick={handleSimulateSuccess}
                      disabled={isSimulating}
                      className="w-full py-2 bg-ezen-secondary text-white text-xs font-bold rounded-lg hover:bg-ezen-secondary/90 disabled:bg-ezen-secondary/50 transition-all cursor-pointer"
                    >
                      {isSimulating ? 'Sending...' : 'Instant Mock Complete'}
                    </button>
                  </div>
                </div>
              )}

              {state === 'QR_EXPIRED' && (
                <div className="py-8 flex flex-col items-center justify-center gap-4 text-center w-full">
                  <span className="material-symbols-outlined text-ezen-outline" style={{ fontSize: '48px' }}>
                    hourglass_disabled
                  </span>
                  <h3 className="font-heading text-lg font-bold text-ezen-on-surface">Payment Session Expired</h3>
                  <p className="text-xs text-ezen-outline font-semibold max-w-xs leading-relaxed">
                    UPI dynamic QR codes expire after 2 minutes for security. Generate a new QR code to restart.
                  </p>
                  <button
                    onClick={handleResetCheckout}
                    className="mt-4 w-full py-2.5 bg-ezen-primary text-white font-bold rounded-full hover:bg-ezen-primary/95 transition-all cursor-pointer shadow-md"
                  >
                    Generate New QR Code
                  </button>
                </div>
              )}

              {state === 'PAYMENT_COMPLETED' && (
                <div className="py-12 flex flex-col items-center justify-center gap-4 text-center w-full animate-in zoom-in-95 duration-200">
                  <span className="material-symbols-outlined text-teal-600 animate-bounce" style={{ fontSize: '56px' }}>
                    check_circle
                  </span>
                  <h3 className="font-heading text-xl font-bold text-ezen-on-surface">Payment Verified</h3>
                  <p className="text-sm text-ezen-on-surface-variant font-medium max-w-xs leading-relaxed">
                    Thank you! Your subscription upgrade is now active.
                  </p>
                  <p className="text-xs text-ezen-outline animate-pulse font-medium">
                    Redirecting you to dashboard...
                  </p>
                </div>
              )}

              {state === 'PAYMENT_FAILED' && (
                <div className="py-8 flex flex-col items-center justify-center gap-4 text-center w-full">
                  <span className="material-symbols-outlined text-red-500" style={{ fontSize: '48px' }}>
                    cancel
                  </span>
                  <h3 className="font-heading text-lg font-bold text-ezen-on-surface">Payment Failed</h3>
                  <p className="text-xs text-ezen-outline font-semibold max-w-xs leading-relaxed">
                    The payment transaction was declined. Please try again.
                  </p>
                  <button
                    onClick={handleResetCheckout}
                    className="mt-4 w-full py-2.5 bg-ezen-primary text-white font-bold rounded-full hover:bg-ezen-primary/95 transition-all cursor-pointer shadow-md"
                  >
                    Generate New QR Code
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-12 h-12 border-4 border-ezen-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-ezen-on-surface-variant font-sans">Loading checkout...</p>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
