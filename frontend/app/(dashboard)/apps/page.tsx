'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { APPS_LIST } from '@/lib/appsData'

export default function AppsPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch queue to display live pending reviews count for the Email Service
  const { data: queue = [] } = useQuery({
    queryKey: ['queue'],
    queryFn: () => api.get('/queue').then((r) => r.data).catch(() => []),
  })

  const apps = APPS_LIST.map((app) => {
    let badge = app.badgeText || null
    if (app.id === 'email' && queue.length > 0) {
      badge = `${queue.length} pending`
    }
    return {
      ...app,
      badge,
    }
  })


  return (
    <div className="max-w-5xl mx-auto py-10 sm:py-16 space-y-12 flex flex-col items-center">
      {/* Page Title & Intro */}
      <div className="text-center space-y-3 max-w-xl">
        <h1 className="font-heading text-4xl sm:text-5xl font-bold text-ezen-on-surface leading-tight">
          <span className="scribble-underline">Applications Hub</span>
        </h1>
        <p className="text-ezen-on-surface-variant text-base">
          Select an application to manage your business operations or configure AI automations.
        </p>
      </div>

      {/* Grid of App Cards */}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 w-full px-4">
        {apps.map((app) => {
          if (app.active) {
            return (
              <Link
                key={app.id}
                href={app.href}
                className="group flex flex-col justify-between p-6 sm:p-8 bg-ezen-surface border-2 border-ezen-outline-variant rounded-3xl transition-all duration-300 hover:shadow-[6px_6px_0_0_var(--ezen-primary)] hover:-translate-y-1 cursor-pointer min-h-[280px]"
              >
                <div className="space-y-5">
                  <div className="flex justify-between items-start">
                    <div className="w-16 h-16 bg-gradient-to-tr from-ezen-primary to-ezen-primary-container text-ezen-on-primary rounded-2xl flex items-center justify-center shadow-md relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
                      <span className="material-symbols-outlined text-3xl icon-fill">{app.icon}</span>
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {mounted && app.badge && (
                      <span className="bg-ezen-error text-white font-sans font-bold text-[10px] px-3 py-1 rounded-full shadow-sm animate-pulse">
                        {app.badge}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-heading text-xl font-bold text-ezen-on-surface group-hover:text-ezen-primary transition-colors">
                      {app.name}
                    </h3>
                    <p className="text-sm text-ezen-on-surface-variant leading-relaxed">
                      {app.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center text-xs font-bold text-ezen-primary mt-6 group-hover:translate-x-1 transition-transform">
                  Launch App
                  <span className="material-symbols-outlined text-xs shrink-0 ml-1.5" style={{ fontSize: '14px' }}>
                    arrow_forward
                  </span>
                </div>
              </Link>
            )
          } else {
            return (
              <div
                key={app.id}
                className="flex flex-col justify-between p-6 sm:p-8 bg-ezen-surface/60 border-2 border-dashed border-ezen-outline-variant/50 rounded-3xl min-h-[280px] select-none relative"
              >
                <div className="space-y-5">
                  <div className="flex justify-between items-start">
                    <div className="w-16 h-16 bg-gradient-to-tr from-ezen-outline/10 to-ezen-outline/25 text-ezen-outline rounded-2xl flex items-center justify-center border border-ezen-outline-variant/30">
                      <span className="material-symbols-outlined text-3xl">{app.icon}</span>
                    </div>
                    <span className="bg-ezen-surface-container-high border border-ezen-outline-variant/40 text-ezen-outline font-sans font-bold text-[10px] px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]" style={{ fontSize: '12px' }}>lock</span>
                      {app.badge}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-heading text-xl font-bold text-ezen-on-surface-variant/80">
                      {app.name}
                    </h3>
                    <p className="text-sm text-ezen-outline leading-relaxed">
                      {app.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center text-xs font-bold text-ezen-outline mt-6">
                  Unavailable
                </div>
              </div>
            )
          }
        })}
      </div>
    </div>
  )
}
