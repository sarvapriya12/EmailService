'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { APPS_LIST } from '@/lib/appsData'

function renderAppIcon(icon: string) {
  switch (icon) {
    case 'emailing':
    case 'mail':
      return (
        <svg viewBox="0 0 100 100" className="w-10 h-10">
          <path d="M50,16 L84,44 L84,82 L16,82 L16,44 Z" fill="#FF9800" />
          <path d="M16,44 L50,62 L84,44" stroke="white" strokeWidth="3.5" fill="none" />
        </svg>
      )
    case 'phone_in_talk':
      return (
        <svg viewBox="0 0 100 100" className="w-10 h-10">
          <circle cx="50" cy="50" r="38" fill="#4CAF50" />
          <path d="M35,35 A15,15 0 0,1 65,35 M30,45 A25,25 0 0,1 70,45" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M40,55 C40,48 60,48 60,55 L58,72 C58,75 42,75 42,72 Z" fill="white" />
        </svg>
      )
    case 'website_builder':
    case 'language':
      return (
        <svg viewBox="0 0 100 100" className="w-10 h-10">
          <circle cx="50" cy="50" r="38" fill="#21759B" />
          <text x="50" y="62" textAnchor="middle" fill="white" fontSize="36" fontWeight="bold" fontFamily="Georgia, serif">W</text>
        </svg>
      )
    case 'chat':
      return (
        <svg viewBox="0 0 100 100" className="w-10 h-10">
          <path d="M20,25 C20,17 27,10 35,10 L75,10 C83,10 90,17 90,25 L90,65 C90,73 83,80 75,80 L35,80 L20,95 Z" fill="#25D366" />
          <text x="55" y="52" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" fontFamily="sans-serif">WA</text>
        </svg>
      )
    case 'photo_camera':
      return (
        <svg viewBox="0 0 100 100" className="w-10 h-10">
          <rect x="15" y="25" width="70" height="55" rx="15" fill="#E1306C" />
          <circle cx="50" cy="52" r="18" stroke="white" strokeWidth="6" fill="none" />
          <circle cx="70" cy="38" r="4" fill="white" />
        </svg>
      )
    default:
      return null
  }
}

interface SavingsCalculatorProps {
  billingCycle?: 'monthly' | 'yearly'
}

export default function SavingsCalculator({ billingCycle = 'monthly' }: SavingsCalculatorProps) {
  const [selectedApps, setSelectedApps] = useState<string[]>([
    'email', 'automated_call', 'website_builder', 'whatsapp_replies', 'instagram_replies'
  ])
  const [usersCount, setUsersCount] = useState<number>(1)
  const [savingsChanged, setSavingsChanged] = useState(false)
  const [showCompare, setShowCompare] = useState<boolean>(false)

  // Calculations for Ezen AI Savings Widget
  const CONVERSION_RATE = 94.94975
  const totalMonthlyReplacedUSD = APPS_LIST.reduce((sum, app) => {
    if (selectedApps.includes(app.id)) {
      return sum + (app.isPerUser ? app.price * usersCount : app.price)
    }
    return sum
  }, 0)

  // Replaced costs (USD and INR)
  const monthlyReplacedINR = totalMonthlyReplacedUSD * CONVERSION_RATE
  const annualReplacedINR = monthlyReplacedINR * 12

  // Ezen costs (pro plan: 399 / month or 4309 / year)
  const ezenPrice = billingCycle === 'monthly' ? 399.00 : 4309.00
  const ezenTotalINR = ezenPrice * usersCount

  // Total replaced cost and savings to display
  const displayReplacedCostINR = billingCycle === 'monthly' ? monthlyReplacedINR : annualReplacedINR
  const displaySavingsINR = Math.max(0, displayReplacedCostINR - ezenTotalINR)

  useEffect(() => {
    setSavingsChanged(true)
    const timer = setTimeout(() => setSavingsChanged(false), 200)
    return () => clearTimeout(timer)
  }, [displaySavingsINR])

  const toggleApp = (id: string) => {
    setSelectedApps(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const formatRupee = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value).replace('INR', '₹').trim();
  }

  return (
    <div className="w-full max-w-6xl mt-12 flex flex-col items-center gap-6">
      <div className="text-center space-y-3 mb-6">
        <h2 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-ezen-primary">
          <span className="relative z-10 px-2.5 inline-block">
            <span className="absolute inset-x-0 bottom-1 top-2 bg-[#ffd754]/90 -rotate-1 rounded-sm -z-10 skew-x-3" />
            Cut costs
          </span>{" "}
          with Ezen AI
        </h2>
        <p className="text-sm text-ezen-outline max-w-md mx-auto">
          Compare pricing with traditional software replacements.
        </p>
      </div>

      <div className="w-full bg-ezen-surface border-2 border-ezen-outline-variant rounded-3xl p-6 sm:p-8 sticker-shadow flex flex-col lg:flex-row gap-8 items-stretch">
        {/* Left Panel: App Grid & User Selector */}
        <div className="flex-1 lg:flex-[1.4] bg-ezen-surface-container-low/60 border border-ezen-outline-variant/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <h3 className="font-heading text-lg font-bold text-ezen-on-surface">Which apps do you use?</h3>
            
            {/* App Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {APPS_LIST.map((app) => {
                const isChecked = selectedApps.includes(app.id)
                return (
                  <div
                    key={app.id}
                    onClick={() => toggleApp(app.id)}
                    className={cn(
                      "aspect-square flex flex-col items-center justify-center p-3 relative bg-white border-2 rounded-2xl select-none cursor-pointer transition-all duration-350 transform active:scale-95",
                      isChecked
                        ? "border-ezen-primary ring-1 ring-ezen-primary shadow-[3px_3px_0_0_var(--ezen-primary)] -translate-x-[1px] -translate-y-[1px]"
                        : "border-ezen-outline-variant/60 hover:border-ezen-primary/40 hover:-translate-y-0.5 hover:shadow-sm"
                    )}
                  >
                    {/* Checkmark Badge */}
                    {isChecked && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ezen-primary flex items-center justify-center text-white text-[10px] font-bold shadow-sm animate-in zoom-in duration-200">
                        <span className="material-symbols-outlined text-[12px] font-bold leading-none">check</span>
                      </div>
                    )}

                    {/* App Icon */}
                    <div className="w-10 h-10 flex items-center justify-center transition-transform duration-300 hover:scale-110">
                      {renderAppIcon(app.icon)}
                    </div>

                    {/* App Name */}
                    <span className="text-[10px] sm:text-xs font-semibold text-ezen-on-surface-variant mt-2 text-center leading-tight">
                      {app.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Users Selector & Compare Toggle Row */}
          <div className="border-t border-ezen-outline-variant/30 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-3">
              <h3 className="font-heading text-base font-bold text-ezen-on-surface">How many users?</h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setUsersCount(prev => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-xl bg-white border-2 border-ezen-outline-variant flex items-center justify-center text-lg font-bold text-ezen-on-surface hover:bg-ezen-surface-container active:scale-95 transition-all select-none cursor-pointer shadow-sm"
                >
                  -
                </button>
                <div className="w-14 h-10 border-2 border-ezen-outline-variant bg-white rounded-xl flex items-center justify-center font-heading text-lg font-bold text-ezen-on-surface shadow-inner">
                  {usersCount}
                </div>
                <button
                  type="button"
                  onClick={() => setUsersCount(prev => prev + 1)}
                  className="w-10 h-10 rounded-xl bg-white border-2 border-ezen-outline-variant flex items-center justify-center text-lg font-bold text-ezen-on-surface hover:bg-ezen-surface-container active:scale-95 transition-all select-none cursor-pointer shadow-sm"
                >
                  +
                </button>
              </div>
            </div>

            {/* Compare our Apps Toggle */}
            <div className="space-y-3">
              <h3 className="font-heading text-base font-bold text-ezen-on-surface">our Apps</h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCompare(prev => !prev)}
                  className={cn(
                    "w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer",
                    showCompare ? "bg-ezen-primary" : "bg-ezen-outline-variant"
                  )}
                >
                  <div
                    className={cn(
                      "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200",
                      showCompare ? "translate-x-6" : "translate-x-0"
                    )}
                  />
                </button>
                <span className="text-sm font-semibold text-ezen-on-surface-variant select-none">
                  {showCompare ? "On" : "Off"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Replaced Apps List & Totals */}
        <div className="flex-1 lg:flex-[1] flex flex-col justify-between p-2 sm:p-4 gap-8">
          {/* Apps to Replace list */}
          <div className="space-y-4">
            <div className="flex justify-between items-baseline border-b border-ezen-outline-variant/30 pb-2">
              <div>
                <h3 className="font-heading text-lg font-bold text-ezen-on-surface">
                  {showCompare ? "our Apps" : "Apps to replace"}
                </h3>
                <p className="text-[10px] text-ezen-outline font-medium">for {usersCount} users</p>
              </div>
              <span className="text-[10px] text-ezen-outline font-bold uppercase tracking-wider">
                / {billingCycle === 'monthly' ? 'month' : 'year'}
              </span>
            </div>

            {/* Scrollable list of selected apps */}
            <div className="max-h-56 overflow-y-auto space-y-2.5 pr-2 custom-scrollbar">
              {APPS_LIST.filter(app => selectedApps.includes(app.id)).length === 0 ? (
                <p className="text-xs text-ezen-outline italic py-4">No apps selected. Click apps on the left grid to calculate replacement costs.</p>
              ) : (
                APPS_LIST.filter(app => selectedApps.includes(app.id)).map((app) => {
                  const itemPriceUSD = app.isPerUser ? app.price * usersCount : app.price
                  const itemPriceINR = billingCycle === 'monthly'
                    ? itemPriceUSD * CONVERSION_RATE
                    : itemPriceUSD * 12 * CONVERSION_RATE

                  return (
                    <div key={app.id} className="flex justify-between items-center text-xs animate-in slide-in-from-right-2 duration-200">
                      <span className="font-medium text-ezen-on-surface">
                        {showCompare ? app.name : app.replacesName}
                      </span>
                      <span className={cn(
                        "font-bold",
                        showCompare ? "text-emerald-600 font-semibold" : "text-ezen-on-surface-variant"
                      )}>
                        {showCompare ? "Included" : formatRupee(itemPriceINR)}
                      </span>
                    </div>
                  )
                })
              )}

              {/* Conditionally show Ezen AI Subscription pricing */}
              {showCompare && (
                <div className="flex justify-between items-center text-xs text-ezen-primary border-t border-ezen-outline-variant/20 pt-2.5 mt-2.5 font-bold animate-in fade-in duration-300">
                  <span>Ezen AI Subscription</span>
                  <span>{formatRupee(ezenTotalINR)}</span>
                </div>
              )}
            </div>

            {/* Total Replaced Cost or Total Bill */}
            <div className="border-t border-dashed border-ezen-outline-variant/50 pt-4 flex justify-between items-center">
              <span className="font-heading text-sm font-bold text-ezen-primary">
                {showCompare ? "TOTAL BILL" : "TOTAL"}
              </span>
              <span className="font-heading text-lg font-extrabold text-ezen-primary">
                {formatRupee(showCompare ? ezenTotalINR : displayReplacedCostINR)} <span className="text-xs font-semibold text-ezen-outline">/ {billingCycle === 'monthly' ? 'month' : 'year'}</span>
              </span>
            </div>
          </div>

          {/* Conditionally show Your Savings Section */}
          {showCompare && (
            <div className="border-t border-ezen-outline-variant/30 pt-6 flex flex-col items-center gap-2 animate-in slide-in-from-bottom-2 duration-300">
              <span className="font-heading text-xl font-bold text-ezen-on-surface-variant">Your savings</span>
              <div className="relative py-2">
                <span className="relative z-10 px-4 py-1.5 text-2xl sm:text-3xl font-heading font-black text-ezen-primary tracking-tight">
                  <span className="absolute inset-x-0 bottom-1 top-2 bg-[#ffd754]/90 -rotate-1 rounded-md -z-10 scale-y-110 shadow-sm" />
                  <span className={cn(
                    "inline-block transition-transform duration-200",
                    savingsChanged ? "scale-110 text-ezen-secondary" : "scale-100"
                  )}>
                    {formatRupee(displaySavingsINR)} <span className="text-sm font-bold">/ {billingCycle === 'monthly' ? 'month' : 'year'}</span>
                  </span>
                </span>
              </div>
              <span className="text-[10px] text-ezen-outline font-semibold tracking-wide">For a fully-integrated software.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
