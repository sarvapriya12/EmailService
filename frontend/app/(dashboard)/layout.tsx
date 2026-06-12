'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import api from '@/lib/api'
import TopAppBar from '@/components/TopAppBar'
import Footer from '@/components/Footer'

const PUBLIC_ROUTES = ['/pricing', '/contact', '/privacy-policy', '/terms', '/refund-policy', '/about', '/help']

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const setUser = useAuthStore((s) => s.setUser)
  const setIsAdmin = useSettingsStore((s) => s.setIsAdmin)
  const setReviewMode = useSettingsStore((s) => s.setReviewMode)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        if (!PUBLIC_ROUTES.includes(pathname)) {
          router.push('/login')
        }
      } else {
        setUser(session.user)
        api.get('/settings').then((r) => {
          setIsAdmin(!!r.data.is_admin)
          setReviewMode(!!r.data.review_mode)
        }).catch(() => {})
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (!session && !PUBLIC_ROUTES.includes(pathname)) {
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, pathname, setUser, setIsAdmin, setReviewMode])

  return (
    <div className="flex flex-col h-screen bg-ezen-background overflow-hidden">
      <TopAppBar />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Ambient Background Glow */}
        <div className="absolute top-0 right-0 w-1/2 h-96 bg-ezen-primary-container/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Page Canvas */}
        <div className="flex-1 overflow-y-auto pt-20 md:pt-28 flex flex-col justify-between">
          <div className="flex-1 px-gutter pb-gutter md:px-margin-desktop md:pb-margin-desktop">
            {children}
          </div>
          <Footer />
        </div>
      </main>
    </div>
  )
}
