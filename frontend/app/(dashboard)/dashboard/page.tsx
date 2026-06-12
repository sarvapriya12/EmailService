'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { 
  Play, 
  ArrowRight, 
  Clock, 
  Layers, 
  CheckCircle, 
  Star, 
  Sparkles, 
  ShieldAlert, 
  Zap 
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const GRID_ITEMS = [
  // row 1
  { type: 'shape', style: 'rounded-none bg-ezen-surface-container' },
  { type: 'avatar', src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80' },
  { type: 'shape', style: 'rounded-tr-3xl bg-ezen-primary/15' },
  { type: 'shape', style: 'rounded-full bg-ezen-surface-container-high' },
  { type: 'avatar', src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80' },
  { type: 'avatar', src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80' },
  { type: 'shape', style: 'rounded-full bg-ezen-surface-container-low' },
  { type: 'shape', style: 'rounded-none bg-ezen-outline-variant/10' },
  { type: 'shape', style: 'rounded-bl-3xl bg-ezen-secondary/25' },
  
  // row 2
  { type: 'shape', style: 'rounded-none bg-ezen-surface-container-highest' },
  { type: 'shape', style: 'rounded-tl-3xl bg-ezen-outline-variant/20' },
  { type: 'shape', style: 'rounded-full bg-ezen-surface-container' },
  { type: 'shape', style: 'rounded-br-3xl bg-ezen-primary/10' },
  { type: 'avatar', src: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80' },
  { type: 'shape', style: 'rounded-tr-3xl bg-ezen-secondary/10' },
  { type: 'avatar', src: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=80&h=80&q=80' },
  { type: 'shape', style: 'rounded-full bg-ezen-surface-container-high' },
  { type: 'shape', style: 'rounded-bl-3xl bg-ezen-outline-variant/15' },

  // row 3
  { type: 'shape', style: 'rounded-full bg-ezen-secondary/15' },
  { type: 'shape', style: 'rounded-none bg-ezen-surface-container' },
  { type: 'avatar', src: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=80&h=80&q=80' },
  { type: 'shape', style: 'rounded-tl-3xl bg-ezen-surface-container-high' },
  { type: 'empty' },
  { type: 'empty' },
  { type: 'empty' },
  { type: 'shape', style: 'rounded-full bg-ezen-surface-container-low' },
  { type: 'avatar', src: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&h=80&q=80' },

  // row 4
  { type: 'shape', style: 'rounded-none bg-ezen-surface-container-low' },
  { type: 'avatar', src: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=80&h=80&q=80' },
  { type: 'avatar', src: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=80&h=80&q=80' },
  { type: 'shape', style: 'rounded-tr-3xl bg-ezen-primary/10' },
  { type: 'empty' },
  { type: 'empty' },
  { type: 'empty' },
  { type: 'shape', style: 'rounded-none bg-ezen-surface-container-highest' },
  { type: 'shape', style: 'rounded-br-3xl bg-ezen-secondary/15' },

  // row 5
  { type: 'avatar', src: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=80&h=80&q=80' },
  { type: 'shape', style: 'rounded-full bg-ezen-outline-variant/10' },
  { type: 'shape', style: 'rounded-bl-3xl bg-ezen-surface-container' },
  { type: 'avatar', src: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&w=80&h=80&q=80' },
  { type: 'avatar', src: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=80&h=80&q=80' },
  { type: 'shape', style: 'rounded-full bg-ezen-surface-container-low' },
  { type: 'avatar', src: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=80&h=80&q=80' },
  { type: 'shape', style: 'rounded-tl-3xl bg-ezen-primary/15' },
  { type: 'avatar', src: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&h=80&q=80' }
]

export default function DashboardPage() {
  const setQueueCount = useSettingsStore((s) => s.setQueueCount)
  const [showDemoModal, setShowDemoModal] = useState(false)

  // Keep queue count fetching active so the store is updated dynamically
  const { data: queue = [] } = useQuery({
    queryKey: ['queue'],
    queryFn: () => api.get('/queue').then((r) => r.data).catch(() => []),
  })

  useEffect(() => {
    setQueueCount(queue.length)
  }, [queue.length, setQueueCount])

  const handleWatchDemo = () => {
    toast.info("Opening Ezen AI interactive platform overview...")
    setShowDemoModal(true)
  }

  return (
    <div className="w-full pb-16 font-sans text-ezen-on-surface">
      
      {/* 1. Hero Section */}
      <section className="relative min-h-[600px] flex flex-col items-center justify-center text-center px-4 sm:px-6 py-12 overflow-hidden">
        <div className="max-w-3xl z-10 space-y-6">
          <span className="inline-flex items-center gap-1.5 bg-ezen-secondary-container/20 text-ezen-on-secondary-container px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            <Zap className="size-3.5 fill-current" />
            Support Intelligence v2.0
          </span>
          
          <h1 className="font-heading text-4xl sm:text-6xl font-extrabold leading-tight text-ezen-primary tracking-tight">
            Intelligence for your Inbox.<br />
            <span className="text-ezen-secondary italic font-normal">Zen for your Support.</span>
          </h1>

          <p className="text-base sm:text-lg text-ezen-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            The modern inbox engine that drafts empathetic, accurate support replies in seconds. Give your founders their time back and your customers the clarity they deserve.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link href="/mails" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto bg-ezen-primary text-white hover:bg-ezen-primary/95 px-8 h-12 rounded-full font-bold text-sm shadow-[0_10px_20px_rgba(80,0,136,0.15)] hover:scale-102 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer">
                Start for free
                <ArrowRight className="size-4" />
              </button>
            </Link>
            <button 
              onClick={handleWatchDemo}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 h-12 rounded-full font-bold text-sm text-ezen-primary border-2 border-ezen-primary/20 hover:bg-ezen-primary/5 transition-all cursor-pointer"
            >
              <Play className="size-4 fill-current" />
              Watch Demo
            </button>
          </div>
        </div>

        {/* Floating Tactile Glass Widget */}
        <div className="mt-16 w-full max-w-md relative z-10 px-4">
          <div className="bg-white/40 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-lg flex flex-col gap-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ezen-secondary/10 flex items-center justify-center border border-ezen-secondary/20">
                <Sparkles className="size-5 text-ezen-secondary" />
              </div>
              <div>
                <div className="text-sm font-bold text-ezen-on-surface">Drafting Response...</div>
                <div className="text-[10px] text-ezen-outline uppercase tracking-wider font-semibold">AI actively learning context</div>
              </div>
            </div>
            <div className="h-2 w-full bg-ezen-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-ezen-primary w-2/3 animate-pulse rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Bento Grid Product Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-12">
          <h2 className="font-heading text-3xl font-extrabold text-ezen-primary">
            Designed for the modern founder.
          </h2>
          <p className="text-sm text-ezen-on-surface-variant mt-2 max-w-md">
            We took the stress out of support by automating the mundane, so you can focus on building.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          
          {/* Card 1: Context-Aware Drafting (colspan-8) */}
          <div className="md:col-span-8 bg-ezen-surface-container rounded-3xl p-8 flex flex-col justify-between overflow-hidden relative border border-ezen-outline-variant/30 shadow-sm">
            <div className="space-y-3 relative z-10">
              <h3 className="font-heading text-2xl font-bold text-ezen-primary">Context-Aware Drafting</h3>
              <p className="text-sm text-ezen-on-surface-variant max-w-lg leading-relaxed">
                Ezen reads your documentation, previous threads, and brand voice to draft replies that sound exactly like you. No generic templates, just intelligence.
              </p>
            </div>
            <div className="mt-8 rounded-2xl overflow-hidden border border-ezen-outline-variant/30 shadow-sm bg-white">
              <img 
                className="w-full h-56 object-cover" 
                alt="Workspace UI preview"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCw4wt9QJkcZvL1BnLp5SIHlGzMZT9Wt6DA-hdtvoC-nB_cmaCZ6Zw36uOm4tJK7zGEp4nu0Itl38SikWrqdTM-PViyz_ppcpkmV6gmuOsqJU0bqTQuAtmOAkUH4ciDsHSirPCqIjGLS8tE5A1vXSm_mo85xU5lHxnMqRyzNKONjgCJoLbe_eOjibNJynjq_on-VXrwkTuxneZQoW0hTrg1olbSH2ALuhj6EIo1jw6gqwBna6iZFk0P2Kq-C1GIbvusoOze91Fpj14" 
              />
            </div>
          </div>

          {/* Card 2: Save 15+ Hours (colspan-4) */}
          <div className="md:col-span-4 bg-ezen-secondary-container/20 rounded-3xl p-8 flex flex-col justify-center items-center text-center border border-ezen-outline-variant/30 shadow-sm">
            <div className="w-16 h-16 bg-ezen-secondary-container/30 rounded-full flex items-center justify-center mb-6 text-ezen-secondary">
              <Clock className="size-8" />
            </div>
            <h3 className="font-heading text-2xl font-bold text-ezen-primary mb-2">Save 15+ Hours</h3>
            <p className="text-sm text-ezen-on-surface-variant max-w-xs leading-relaxed">
              The average founder saves over two full workdays per week by letting Ezen handle initial support triage.
            </p>
          </div>

          {/* Card 3: Integration (colspan-5) */}
          <div className="md:col-span-5 bg-ezen-surface-container rounded-3xl p-8 flex items-center gap-6 border border-ezen-outline-variant/30 shadow-sm">
            <div className="flex-1 space-y-1">
              <h4 className="font-bold text-xs uppercase tracking-widest text-ezen-outline font-mono">Integration</h4>
              <p className="font-heading text-lg font-bold text-ezen-primary">
                One-click sync with Slack, Intercom, & Gmail.
              </p>
            </div>
            <div className="w-20 h-20 bg-white/70 rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-ezen-primary border border-ezen-outline-variant/20">
              <Layers className="size-10" />
            </div>
          </div>

          {/* Card 4: Live Accuracy Metrics (colspan-7) */}
          <div className="md:col-span-7 bg-white rounded-3xl p-8 flex flex-col justify-center border-2 border-dashed border-ezen-outline-variant shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ezen-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-ezen-secondary"></span>
              </span>
              <span className="font-bold text-xs text-ezen-secondary uppercase tracking-wider font-mono">Live Accuracy Metric</span>
            </div>
            <h3 className="font-heading text-2xl font-bold text-ezen-primary mb-2">94% Accuracy Rate</h3>
            <p className="text-sm text-ezen-on-surface-variant leading-relaxed">
              Our humanist AI model reduces hallucinations to near-zero by grounding every response in your actual technical logs and historical email presets.
            </p>
          </div>

        </div>
      </section>

      {/* 3. Customer Hub Mosaic Grid */}
      <section className="py-20 bg-gradient-to-b from-white to-[#F9F7F8] border-t border-ezen-outline-variant/20 overflow-hidden relative">
        <div className="max-w-6xl mx-auto px-4 relative flex flex-col items-center justify-center min-h-[460px]">
          
          {/* Mosaic Shapes Grid */}
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-4 w-full opacity-65 select-none pointer-events-none">
            {GRID_ITEMS.map((item, idx) => {
              if (item.type === 'empty') {
                return <div key={idx} className="aspect-square hidden md:block" />
              }
              if (item.type === 'avatar') {
                return (
                  <div key={idx} className="aspect-square w-full rounded-2xl overflow-hidden shadow-sm border border-ezen-outline-variant/30 bg-ezen-surface-container-low transition-all duration-300 hover:scale-110">
                    <img className="w-full h-full object-cover grayscale opacity-80" src={item.src} alt="User avatar" />
                  </div>
                )
              }
              return (
                <div key={idx} className={cn("aspect-square w-full border border-ezen-outline-variant/20 transition-all duration-300 hover:scale-105", item.style)} />
              )
            })}
          </div>

          {/* Central Card overlay */}
          <div className="absolute bg-white px-8 py-10 rounded-[2rem] border-2 border-ezen-outline-variant/50 shadow-xl max-w-md w-full text-center z-10 mx-4 animate-in fade-in zoom-in-95 duration-500">
            {/* Happy arrow scribble pointer */}
            <div className="absolute -top-12 -right-8 hidden sm:flex flex-col items-center">
              <span className="text-[11px] font-heading font-black text-ezen-secondary uppercase tracking-widest rotate-6">happy</span>
              <svg className="w-10 h-10 text-ezen-secondary -scale-y-100 rotate-45 -translate-y-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
            
            <h3 className="font-heading text-3xl font-extrabold text-ezen-primary leading-tight">
              Join 15 million users
            </h3>
            <p className="text-sm text-ezen-on-surface-variant mt-2.5 font-medium">
              who grow their business with Ezen AI
            </p>
          </div>
        </div>
      </section>

      {/* 4. Core Value Highlight */}
      <section className="py-12 bg-[#F9F7F8] px-4">
        <div className="max-w-4xl mx-auto bg-white border-2 border-ezen-outline-variant rounded-[2.5rem] p-8 sm:p-12 text-center shadow-md relative overflow-hidden">
          
          <div className="space-y-4 relative z-10 max-w-3xl mx-auto">
            <p className="text-lg sm:text-xl font-heading font-bold text-ezen-primary leading-relaxed">
              Deploying Ezen AI transforms customer care operations. By automating initial support responses, global support coverage is expanded across time zones instantly, and the daily support workload becomes completely stress-free.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Unleash Growth Potential Section */}
      <section className="py-20 bg-gradient-to-b from-[#F9F7F8] to-white px-4 text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-8 relative">
          
          <h2 className="font-heading text-4xl sm:text-6xl font-black text-ezen-primary leading-tight tracking-tight max-w-xl mx-auto relative">
            <span className="block text-ezen-primary">Unleash</span>
            <span className="text-[#107A72] block">your growth potential</span>
          </h2>

          <div className="space-y-4">
            <Link href="/mails">
              <button className="bg-[#714B67] hover:bg-[#5E3E56] text-white font-heading font-extrabold px-12 h-14 rounded-full shadow-lg hover:shadow-xl hover:scale-102 active:scale-95 transition-all text-sm tracking-wider uppercase cursor-pointer">
                Start now - It's free
              </button>
            </Link>
            
            <div className="flex flex-col items-center gap-1.5 pt-4">
              <span className="material-symbols-outlined text-teal-600 animate-bounce text-base leading-none">
                arrow_upward
              </span>
              <p className="text-[11px] text-ezen-outline font-bold uppercase tracking-wider">
                No credit card required • Instant access
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Modal (Watch Demo Modal simulator) */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-ezen-outline-variant rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative">
            <button 
              onClick={() => setShowDemoModal(false)}
              className="absolute top-4 right-4 text-ezen-outline hover:text-ezen-primary font-bold text-lg cursor-pointer"
            >
              &times;
            </button>
            <h3 className="font-heading text-2xl font-extrabold text-ezen-primary mb-4">Ezen Platform Walkthrough</h3>
            <div className="aspect-video bg-ezen-surface-container rounded-2xl flex flex-col items-center justify-center p-6 border border-ezen-outline-variant/30 text-center relative overflow-hidden group">
              <img 
                className="absolute inset-0 w-full h-full object-cover opacity-20 filter grayscale" 
                alt="Demo background" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCw4wt9QJkcZvL1BnLp5SIHlGzMZT9Wt6DA-hdtvoC-nB_cmaCZ6Zw36uOm4tJK7zGEp4nu0Itl38SikWrqdTM-PViyz_ppcpkmV6gmuOsqJU0bqTQuAtmOAkUH4ciDsHSirPCqIjGLS8tE5A1vXSm_mo85xU5lHxnMqRyzNKONjgCJoLbe_eOjibNJynjq_on-VXrwkTuxneZQoW0hTrg1olbSH2ALuhj6EIo1jw6gqwBna6iZFk0P2Kq-C1GIbvusoOze91Fpj14" 
              />
              <Play className="size-12 text-ezen-primary mb-4 relative z-10 animate-pulse group-hover:scale-110 transition-transform" />
              <p className="text-xs text-ezen-on-surface font-semibold max-w-sm relative z-10 leading-normal">
                This is a simulated demo overlay. Once you upgrade your subscription, complete platform guide videos will unlock.
              </p>
            </div>
            <button 
              onClick={() => setShowDemoModal(false)}
              className="mt-6 w-full py-2.5 bg-ezen-primary text-white font-bold rounded-xl hover:bg-ezen-primary/95 transition-all cursor-pointer"
            >
              Close Walkthrough
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
