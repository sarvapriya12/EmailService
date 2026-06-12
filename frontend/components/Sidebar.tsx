'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logout } from '@/lib/auth'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: string
  badge?: number | null
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const queueCount = useSettingsStore((s) => s.queueCount)
  const isAdmin = useSettingsStore((s) => s.isAdmin)
  const collapsed = useSidebarStore((s) => s.collapsed)

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const mainNav: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/mails', label: 'Mails', icon: 'mail', badge: queueCount > 0 ? queueCount : null },
    { href: '/tickets', label: 'Tickets', icon: 'inbox' },
    { href: '/filters', label: 'Filters', icon: 'filter_alt' },
    { href: '/analytics', label: 'Analytics', icon: 'bar_chart' },
    { href: '/settings', label: 'Settings', icon: 'settings' },
    { href: '/subscription', label: 'Subscription', icon: 'credit_card' },
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <nav
      className={cn(
        'sidebar-nav fixed left-0 top-0 h-full bg-ezen-surface border-r border-ezen-outline-variant flex flex-col py-gutter z-50 overflow-x-hidden',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar-width'
      )}
    >
      {/* Header */}
      <div className={cn(
        'px-gutter mb-8 flex items-center gap-3',
        collapsed && 'px-0 justify-center'
      )}>
        <div className="w-8 h-8 shrink-0 rounded-lg bg-ezen-primary-container flex items-center justify-center text-ezen-on-primary font-heading font-bold text-lg">
          E
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-heading text-2xl font-bold text-ezen-primary whitespace-nowrap">Ezen AI</h1>
            <p className="font-sans text-xs font-semibold text-ezen-on-surface-variant uppercase tracking-wider mt-0.5 whitespace-nowrap">Support Intelligence</p>
          </div>
        )}
      </div>

      {/* CTA - New Draft */}
      <div className={cn('px-gutter mb-6', collapsed && 'px-4')}>
        <button className={cn(
          'w-full bg-ezen-primary hover:bg-ezen-primary-container text-ezen-on-primary rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-colors duration-200 shadow-sm font-semibold text-sm',
          collapsed && 'px-0'
        )}>
          <span className="material-symbols-outlined shrink-0" style={{ fontSize: '20px' }}>edit_square</span>
          {!collapsed && <span className="whitespace-nowrap">New Draft</span>}
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-1">
        {mainNav.map(({ href, label, icon, badge }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center py-3 text-ezen-on-surface-variant hover:bg-ezen-surface-container-high transition-all duration-200 rounded-xl group',
              collapsed ? 'px-0 justify-center' : 'px-4',
              isActive(href) && 'text-ezen-primary font-bold border-2 border-ezen-primary bg-ezen-primary-container/10 shadow-[4px_4px_0_0_#57344f]'
            )}
          >
            <span
              className={cn(
                'material-symbols-outlined shrink-0 group-hover:text-ezen-primary transition-colors',
                !collapsed && 'mr-3',
                isActive(href) && 'icon-fill text-ezen-primary'
              )}
            >
              {icon}
            </span>
            {!collapsed && (
              <>
                <span className="font-semibold text-sm whitespace-nowrap">{label}</span>
                {badge != null && (
                  <span className="ml-auto bg-ezen-primary-container/20 text-ezen-primary px-2 py-0.5 rounded-full font-semibold text-xs">
                    {badge}
                  </span>
                )}
              </>
            )}
          </Link>
        ))}

        {/* Admin link */}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center py-3 text-ezen-on-surface-variant hover:bg-ezen-surface-container-high transition-all duration-200 rounded-xl group',
              collapsed ? 'px-0 justify-center' : 'px-4',
              isActive('/admin') && 'text-ezen-primary font-bold border-2 border-ezen-primary bg-ezen-primary-container/10 shadow-[4px_4px_0_0_#57344f]'
            )}
          >
            <span className={cn(
              'material-symbols-outlined shrink-0 group-hover:text-ezen-primary transition-colors',
              !collapsed && 'mr-3',
              isActive('/admin') && 'icon-fill text-ezen-primary'
            )}>
              admin_panel_settings
            </span>
            {!collapsed && <span className="font-semibold text-sm whitespace-nowrap">Admin</span>}
          </Link>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="px-4 mt-auto pt-4 border-t border-ezen-outline-variant flex flex-col gap-1">
        <a
          href="#"
          className={cn(
            'flex items-center py-2 text-ezen-on-surface-variant hover:bg-ezen-surface-container-high transition-colors duration-200 rounded-xl',
            collapsed ? 'px-0 justify-center' : 'px-4'
          )}
        >
          <span className={cn('material-symbols-outlined shrink-0', !collapsed && 'mr-3')} style={{ fontSize: '20px' }}>help_outline</span>
          {!collapsed && <span className="font-semibold text-sm whitespace-nowrap">Help</span>}
        </a>
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center py-2 text-ezen-on-surface-variant hover:bg-ezen-surface-container-high transition-colors duration-200 rounded-xl w-full',
            collapsed ? 'px-0 justify-center' : 'px-4'
          )}
        >
          <span className={cn('material-symbols-outlined shrink-0', !collapsed && 'mr-3')} style={{ fontSize: '20px' }}>logout</span>
          {!collapsed && <span className="font-semibold text-sm whitespace-nowrap">Sign Out</span>}
        </button>
      </div>
    </nav>
  )
}
