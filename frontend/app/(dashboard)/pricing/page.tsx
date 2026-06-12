'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/useAuthStore'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import SavingsCalculator from '@/components/SavingsCalculator'

const PLANS = [
  {
    tier: 'free',
    label: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    limit: 25,
    features: ['Automated mail (25/mo)', 'Website builder', 'Basic AI replies']
  },
  {
    tier: 'pro',
    label: 'Pro',
    monthlyPrice: 399,
    yearlyPrice: 4309, // (399 * 12) * 0.9 = 4309.2
    limit: 500,
    features: ['Automated mail (500/mo)', 'Website builder', 'AI WhatsApp Replies', 'Advanced AI', 'Analytics']
  },
  {
    tier: 'enterprise',
    label: 'Enterprise',
    monthlyPrice: 899,
    yearlyPrice: 9709, // (899 * 12) * 0.9 = 9709.2
    limit: 1500,
    features: ['Automated mail (1500/mo)', 'Website builder', 'AI WhatsApp Replies', 'AI Instagram DM Replies', 'Automated call', 'Priority support']
  },
]

export default function PricingPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Query settings, which now includes tier, emails_used, and emails_limit
  const { data: subscription } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
    enabled: !!user && mounted,
  })

  // Mutation to upgrade subscription
  const mutation = useMutation({
    mutationFn: async (tier: string) => {
      const res = await api.post('/subscription/upgrade', { tier })
      return res.data
    },
    onSuccess: (data) => {
      toast.success(`Successfully updated subscription to ${data.tier ?? 'new'} plan!`)
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setSelectedTier(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || 'Failed to update subscription. Please try again.')
    }
  })

  const currentTier = subscription?.tier ?? 'free'

  const handlePlanAction = (tier: string) => {
    if (!user) {
      toast.error('Please sign in to choose a pricing plan.')
      router.push('/login')
      return
    }
    if (tier === 'free') {
      setSelectedTier(tier)
    } else {
      const planParam = billingCycle === 'monthly' ? tier : `${tier}_yearly`
      router.push(`/checkout?plan=${planParam}`)
    }
  }

  const handleConfirmUpgrade = () => {
    if (selectedTier) {
      mutation.mutate(selectedTier)
    }
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto flex flex-col items-center justify-center w-full pb-12">
      {/* ===== Page Header ===== */}
      <div className="text-center space-y-3">
        <h1 className="font-heading text-4xl sm:text-5xl font-bold leading-tight text-ezen-on-background">
          <span className="scribble-underline">Pricing</span>
        </h1>
        <p className="max-w-xl text-base text-ezen-outline">
          Compare available plans or track your active usage stats.
        </p>
      </div>

      {/* ===== Billing Cycle Toggle ===== */}
      <div className="flex items-center justify-center gap-3 bg-ezen-surface border border-ezen-outline-variant p-1.5 rounded-full shadow-sm">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer",
            billingCycle === 'monthly'
              ? "bg-ezen-primary text-white shadow-sm"
              : "text-ezen-outline hover:text-ezen-on-surface"
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle('yearly')}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5",
            billingCycle === 'yearly'
              ? "bg-ezen-primary text-white shadow-sm"
              : "text-ezen-outline hover:text-ezen-on-surface"
          )}
        >
          Yearly
          <span className="bg-[#ffd754] text-ezen-primary text-[9px] px-2 py-0.5 rounded-full font-black animate-pulse">
            Save 10%
          </span>
        </button>
      </div>

      {/* ===== Plans Grid ===== */}
      <div className="grid gap-8 sm:grid-cols-3 w-full">
        {PLANS.map((plan) => {
          const isCurrent = mounted && user && currentTier === plan.tier
          const priceDisplay = plan.tier === 'free'
            ? '₹0'
            : billingCycle === 'monthly'
            ? `₹${plan.monthlyPrice}`
            : `₹${plan.yearlyPrice}`
          const cycleLabel = plan.tier === 'free'
            ? ''
            : billingCycle === 'monthly'
            ? '/mo'
            : '/yr'
          const billingSubtext = plan.tier === 'free'
            ? 'Free support tier'
            : billingCycle === 'monthly'
            ? 'Billed monthly'
            : `Equivalent to ₹${Math.round(plan.yearlyPrice / 12)}/mo`

          return (
            <div
              key={plan.tier}
              className={cn(
                'bg-ezen-surface border-2 rounded-3xl p-6 sm:p-8 transition-all flex flex-col justify-between text-center items-center relative min-h-[420px]',
                isCurrent
                  ? 'border-ezen-primary shadow-[6px_6px_0_0_var(--ezen-primary)]'
                  : 'border-ezen-outline-variant shadow-[6px_6px_0_0_var(--ezen-outline-variant)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]'
              )}
            >
              <div className="space-y-6 w-full flex flex-col items-center">
                <div className="flex flex-col items-center gap-2">
                  <h3 className="font-heading text-xl font-bold text-ezen-on-surface capitalize">{plan.label}</h3>
                  {isCurrent && (
                    <span className="bg-ezen-primary-container/20 text-ezen-primary border border-ezen-primary px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Current Plan
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[38px] font-heading font-extrabold text-ezen-primary leading-none">
                    {priceDisplay}
                    {cycleLabel && <span className="text-sm font-bold text-ezen-outline">{cycleLabel}</span>}
                  </p>
                  <p className="text-xs text-ezen-outline mt-1">{billingSubtext}</p>
                </div>
                <hr className="border-ezen-outline-variant/50 w-full" />
                <ul className="space-y-3 w-full flex flex-col items-center">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-ezen-on-surface-variant">
                      <span className="material-symbols-outlined text-ezen-secondary shrink-0 select-none" style={{ fontSize: '18px' }}>
                        check_circle
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="mt-8 w-full">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 px-4 rounded-full border border-ezen-outline-variant text-ezen-outline font-bold text-sm bg-ezen-surface-dim cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handlePlanAction(plan.tier)}
                    disabled={mutation.isPending}
                    className={cn(
                      "w-full py-3 px-4 rounded-full font-bold text-sm transition-all shadow-md active:scale-98 active:shadow-sm cursor-pointer",
                      plan.tier === 'free'
                        ? "bg-ezen-surface border-2 border-ezen-primary text-ezen-primary hover:bg-ezen-primary-container/10"
                        : "bg-ezen-primary border-2 border-ezen-primary text-white hover:bg-ezen-primary/95"
                    )}
                  >
                    {mutation.isPending && selectedTier === plan.tier
                      ? 'Processing...'
                      : plan.tier === 'free'
                      ? 'Start now'
                      : 'Buy now'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-ezen-surface-container-low border border-dashed border-ezen-outline-variant rounded-2xl p-5 text-center max-w-2xl">
        <p className="text-sm text-ezen-on-surface-variant font-semibold">
          Need more emails or custom setups? To upgrade your plan, contact support or ask your administrator.
        </p>
      </div>

      {/* ===== Ezen AI Interactive Cost Calculator ===== */}
      <SavingsCalculator billingCycle={billingCycle} />

      {/* ===== Custom Checkout / Confirm Modal ===== */}
      {selectedTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-ezen-surface border-2 border-ezen-primary rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-ezen-primary/10 text-ezen-primary flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-2xl font-bold">
                {selectedTier === 'free' ? 'replay' : 'shopping_bag'}
              </span>
            </div>
            
            <h3 className="font-heading text-2xl font-bold text-ezen-on-surface mb-2">
              Confirm Downgrade
            </h3>
            
            <p className="text-sm text-ezen-on-surface-variant mb-6 leading-relaxed">
              Are you sure you want to change your plan to Free? Your limit will be set to 25 emails/month.
            </p>

            <div className="flex gap-3 w-full justify-center">
              <button
                onClick={() => setSelectedTier(null)}
                disabled={mutation.isPending}
                className="flex-1 py-2.5 px-4 rounded-full border border-ezen-outline-variant text-ezen-on-surface font-bold text-sm bg-transparent hover:bg-ezen-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpgrade}
                disabled={mutation.isPending}
                className="flex-1 py-2.5 px-4 rounded-full font-bold text-sm bg-ezen-primary text-white border-2 border-ezen-primary hover:bg-ezen-primary/95 transition-all shadow-md cursor-pointer"
              >
                {mutation.isPending ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
