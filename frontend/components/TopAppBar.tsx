'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logout } from '@/lib/auth'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: string
  badge?: number | null
}

export default function TopAppBar() {
  const pathname = usePathname()
  const router = useRouter()
  const queueCount = useSettingsStore((s) => s.queueCount)
  const isAdmin = useSettingsStore((s) => s.isAdmin)
  const user = useAuthStore((s) => s.user)
  
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    setMounted(true)

    const handleScroll = (e: any) => {
      const el = e.target
      let scrollTop = 0
      if (el === document || el === window) {
        scrollTop = window.scrollY || document.documentElement.scrollTop
      } else if (el && el.scrollTop !== undefined) {
        scrollTop = el.scrollTop
      }
      setScrolled(scrollTop > 10)
    }

    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [])

  // Fetch queue count dynamically to update notifications and app badges
  const { data: queue = [] } = useQuery({
    queryKey: ['queue'],
    queryFn: () => api.get('/queue').then((r) => r.data).catch(() => []),
    refetchInterval: 15000,
  })

  const currentQueueCount = queue.length > 0 ? queue.length : (queueCount > 0 ? queueCount : null)

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  // Determine if we are visiting an application route inside the Email Service
  const isEmailService = [
    '/mails',
    '/tickets',
    '/filters',
    '/analytics',
    '/admin'
  ].some(route => pathname === route || pathname.startsWith(route + '/'))

  const emailServiceNav: NavItem[] = [
    { href: '/apps', label: 'Apps', icon: 'apps' },
    { href: '/mails', label: 'Mails', icon: 'mail', badge: currentQueueCount },
    { href: '/tickets', label: 'Tickets', icon: 'confirmation_number' },
    { href: '/filters', label: 'Filters', icon: 'filter_alt' },
    { href: '/analytics', label: 'Analytics', icon: 'bar_chart' },
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <header className={cn(
      "flex justify-between items-center h-16 px-gutter w-full z-45 fixed top-0 left-0 transition-all duration-300 gap-4 text-white",
      scrolled 
        ? "bg-[#181417]/70 backdrop-blur-xl border-b border-[#2e262c]/60 shadow-[0_4px_20px_rgba(0,0,0,0.15)]" 
        : "bg-[#181417] border-b border-[#2e262c]"
    )}>
      {/* Brand Logo & App Context Indicator */}
      <div className="flex items-center gap-3 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 select-none group">
          <div className="w-9 h-9 rounded-xl bg-ezen-primary flex items-center justify-center text-ezen-on-primary font-heading font-extrabold text-lg shadow-sm group-hover:scale-105 transition-all">
            E
          </div>
          <div className="flex items-center gap-2">
            <span className="font-heading text-lg font-bold text-white tracking-tight">Ezen AI</span>
            {isEmailService && (
              <>
                <span className="text-[#2e262c] font-light text-sm">|</span>
                <span className="hidden sm:inline-block text-[10px] font-sans font-bold text-[#e9e0e3]/85 uppercase tracking-wider">Email Service</span>
              </>
            )}
          </div>
        </Link>
      </div>

      {/* Main Navbar vs App Specific Navbar */}
      {!isEmailService ? (
        /* MAIN DASHBOARD NAVBAR (Apps, Pricing, About Us, Help) */
        <nav className="hidden lg:flex items-center gap-1.5 relative">
          <Link
            href="/apps"
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all duration-200 font-semibold text-sm group cursor-pointer",
              isActive('/apps') ? "text-[#e9b8d9] bg-[#714b67]/25 border border-[#714b67]/40 shadow-sm" : "text-[#e9e0e3] hover:text-white hover:bg-[#2b2229]"
            )}
          >
            <span className="material-symbols-outlined text-[18px]">apps</span>
            <span>Apps</span>
          </Link>

          <Link 
            href="/pricing" 
            className={cn(
              "px-4 py-2 rounded-xl transition-all duration-200 font-semibold text-sm hover:text-white hover:bg-[#2b2229]",
              isActive('/pricing') ? "text-[#e9b8d9] bg-[#714b67]/25 border border-[#714b67]/40 shadow-sm" : "text-[#e9e0e3]"
            )}
          >
            Pricing
          </Link>
          <Link 
            href="/about" 
            className={cn(
              "px-4 py-2 rounded-xl transition-all duration-200 font-semibold text-sm hover:text-white hover:bg-[#2b2229]",
              isActive('/about') ? "text-[#e9b8d9] bg-[#714b67]/25 border border-[#714b67]/40 shadow-sm" : "text-[#e9e0e3]"
            )}
          >
            About Us
          </Link>
          <Link 
            href="/help" 
            className={cn(
              "px-4 py-2 rounded-xl transition-all duration-200 font-semibold text-sm hover:text-white hover:bg-[#2b2229]",
              isActive('/help') ? "text-[#e9b8d9] bg-[#714b67]/25 border border-[#714b67]/40 shadow-sm" : "text-[#e9e0e3]"
            )}
          >
            Help
          </Link>
        </nav>
      ) : (
        /* EMAIL SERVICE NAVBAR (Mails, Tickets, Filters, Analytics, Settings, Subscription, Admin) */
        <nav className="hidden lg:flex items-center gap-1">
          {emailServiceNav.map(({ href, label, icon, badge }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2 text-[#e9e0e3] hover:text-white hover:bg-[#2b2229] rounded-xl transition-all duration-200 font-semibold text-sm group",
                isActive(href) && "text-[#e9b8d9] bg-[#714b67]/25 border border-[#714b67]/40 shadow-sm"
              )}
            >
              <span className={cn(
                "material-symbols-outlined text-[18px] group-hover:text-white transition-colors",
                isActive(href) && "icon-fill text-[#e9b8d9]"
              )}>
                {icon}
              </span>
              <span>{label}</span>
              {mounted && badge != null && (
                <span className="bg-ezen-primary text-white px-1.5 py-0.5 rounded-full font-bold text-[9px] leading-none shrink-0">
                  {badge}
                </span>
              )}
            </Link>
          ))}
          {mounted && isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2 text-[#e9e0e3] hover:text-white hover:bg-[#2b2229] rounded-xl transition-all duration-200 font-semibold text-sm group",
                isActive('/admin') && "text-[#e9b8d9] bg-[#714b67]/25 border border-[#714b67]/40 shadow-sm"
              )}
            >
              <span className={cn(
                "material-symbols-outlined text-[18px] group-hover:text-white transition-colors",
                isActive('/admin') && "icon-fill text-[#e9b8d9]"
              )}>
                admin_panel_settings
              </span>
              <span>Admin</span>
            </Link>
          )}
        </nav>
      )}

      {/* Trailing Controls (User Profile / Auth actions - Profile only visible if signed in) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-white">
        {mounted && user ? (
          <>
            {/* Notifications */}
            <button className="relative w-9 h-9 rounded-full flex items-center justify-center text-[#e9e0e3] hover:text-white hover:bg-[#2b2229] transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              {mounted && currentQueueCount != null && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-ezen-error rounded-full border border-[#181417]"></span>
              )}
            </button>

            <div className="h-6 w-[1px] bg-[#2e262c] mx-1 hidden sm:block"></div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen)
                  setMobileMenuOpen(false)
                }}
                className="w-9 h-9 rounded-full overflow-hidden border border-[#2e262c] hover:border-white transition-all cursor-pointer bg-[#714b67] flex items-center justify-center text-white font-heading font-bold text-sm shrink-0"
              >
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-[#181417] border border-[#2e262c] rounded-2xl shadow-lg z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-150 text-white">
                    <div className="px-4 py-2 border-b border-[#2e262c]">
                      <p className="text-[10px] uppercase font-bold text-[#e9e0e3]/60 tracking-wider">Signed in as</p>
                      <p className="text-xs font-bold text-white truncate mt-0.5">{user?.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#e9e0e3] hover:text-white hover:bg-[#2b2229] transition-colors font-semibold"
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#e9e0e3]">settings</span>
                      Settings
                    </Link>
                    <Link
                      href="/help"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#e9e0e3] hover:text-white hover:bg-[#2b2229] transition-colors font-semibold"
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#e9e0e3]">help_outline</span>
                      Help & Support
                    </Link>
                    <div className="h-[1px] bg-[#2e262c] my-1"></div>
                    <button
                      onClick={() => {
                        setProfileOpen(false)
                        handleLogout()
                      }}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors font-bold w-full text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          /* Sign In & Free Trial Options Rendered When NOT Signed In */
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-[#e9e0e3] hover:text-white transition-colors font-semibold text-sm">
              Sign in
            </Link>
            <Link href="/login" className="bg-[#e9b8d9] text-[#57344f] hover:bg-[#ffd7f1] px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-102">
              Try it free
            </Link>
          </div>
        )}

        {/* Mobile Hamburger menu */}
        <button
          onClick={() => {
            setMobileMenuOpen(!mobileMenuOpen)
            setProfileOpen(false)
          }}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-[#e9e0e3] hover:text-white hover:bg-[#2b2229] transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 top-16 bg-black/40 backdrop-blur-xs z-35 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 right-0 top-16 bg-[#181417] border-b border-[#2e262c] shadow-lg z-40 px-4 py-3 flex flex-col gap-1 lg:hidden animate-in slide-in-from-top duration-200 max-h-[calc(100vh-4rem)] overflow-y-auto text-white">
            {!isEmailService ? (
              /* Mobile Main Navbar Links */
              <>
                <Link
                  href="/apps"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-[#e9e0e3] hover:text-white hover:bg-[#2b2229] rounded-xl transition-all font-semibold text-sm",
                    isActive('/apps') && "text-[#e9b8d9] bg-[#714b67]/25 border border-[#714b67]/20"
                  )}
                >
                  <span className={cn("material-symbols-outlined text-[20px]", isActive('/apps') && "icon-fill text-[#e9b8d9]")}>
                    apps
                  </span>
                  Apps
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-[#e9e0e3] hover:text-white hover:bg-[#2b2229] rounded-xl transition-all font-semibold text-sm",
                    isActive('/pricing') && "text-[#e9b8d9] bg-[#714b67]/25 border border-[#714b67]/20"
                  )}
                >
                  <span className={cn("material-symbols-outlined text-[20px]", isActive('/pricing') && "icon-fill text-[#e9b8d9]")}>
                    credit_card
                  </span>
                  Pricing
                </Link>
                <Link
                  href="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-[#e9e0e3] hover:text-white hover:bg-[#2b2229] rounded-xl transition-all font-semibold text-sm",
                    isActive('/about') && "text-[#e9b8d9] bg-[#714b67]/25 border border-[#714b67]/20"
                  )}
                >
                  <span className={cn("material-symbols-outlined text-[20px]", isActive('/about') && "icon-fill text-[#e9b8d9]")}>
                    info
                  </span>
                  About Us
                </Link>
                <Link
                  href="/help"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-[#e9e0e3] hover:text-white hover:bg-[#2b2229] rounded-xl transition-all font-semibold text-sm",
                    isActive('/help') && "text-[#e9b8d9] bg-[#714b67]/25 border border-[#714b67]/20"
                  )}
                >
                  <span className={cn("material-symbols-outlined text-[20px]", isActive('/help') && "icon-fill text-[#e9b8d9]")}>
                    help
                  </span>
                  Help
                </Link>
              </>
            ) : (
              /* Mobile App Specific Sub-Navbar Links */
              <>
                {emailServiceNav.map(({ href, label, icon, badge }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-[#e9e0e3] hover:text-white hover:bg-[#2b2229] rounded-xl transition-all font-semibold text-sm",
                      isActive(href) && "text-[#e9b8d9] bg-[#714b67]/25 border border-[#714b67]/20"
                    )}
                  >
                    <span className={cn("material-symbols-outlined text-[20px]", isActive(href) && "icon-fill text-[#e9b8d9]")}>
                      {icon}
                    </span>
                    <span>{label}</span>
                    {mounted && badge != null && (
                      <span className="ml-auto bg-ezen-primary text-white px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0">
                        {badge}
                      </span>
                    )}
                  </Link>
                ))}
                {mounted && isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-[#e9e0e3] hover:text-white hover:bg-[#2b2229] rounded-xl transition-all font-semibold text-sm",
                      isActive('/admin') && "text-[#e9b8d9] bg-[#714b67]/25 border border-[#714b67]/20"
                    )}
                  >
                    <span className={cn("material-symbols-outlined text-[20px]", isActive('/admin') && "icon-fill text-[#e9b8d9]")}>
                      admin_panel_settings
                    </span>
                    <span>Admin</span>
                  </Link>
                )}
              </>
            )}

            {mounted && user && (
              <>
                <div className="h-[1px] bg-[#2e262c] my-2"></div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleLogout()
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-bold text-sm w-full text-left"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  Sign Out
                </button>
              </>
            )}
          </div>
        </>
      )}
    </header>
  )
}
