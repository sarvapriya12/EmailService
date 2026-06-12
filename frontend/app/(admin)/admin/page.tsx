'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export default function AdminPage() {
  const qc = useQueryClient()
  const router = useRouter()
  const [upgradeForm, setUpgradeForm] = useState<Record<string, { tier: string; limit: string }>>({})

  // Fetch settings to verify admin status
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
    enabled: !!settings?.is_admin, // Only query if admin
  })

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data),
    enabled: !!settings?.is_admin, // Only query if admin
  })

  const upgrade = useMutation({
    mutationFn: ({ userId, tier, limit }: { userId: string; tier: string; limit: number }) =>
      api.post(`/admin/users/${userId}/upgrade`, { tier, new_limit: limit }),
    onSuccess: (_, vars) => {
      toast.success(`User upgraded to ${vars.tier}`)
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setUpgradeForm((p) => { const n = { ...p }; delete n[vars.userId]; return n })
    },
    onError: () => toast.error('Upgrade failed. Admin privileges required.'),
  })

  if (settingsLoading) {
    return (
      <div className="space-y-8 max-w-5xl animate-pulse">
        <div className="h-10 bg-ezen-surface-container rounded-xl w-1/3" />
        <div className="h-4 bg-ezen-surface-container rounded-lg w-1/2" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-ezen-surface-container rounded-2xl h-[100px]" />
          ))}
        </div>
      </div>
    )
  }

  if (!settings?.is_admin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-6 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-ezen-error/10 text-ezen-error flex items-center justify-center border border-ezen-error/20 shadow-sm animate-bounce">
          <span className="material-symbols-outlined text-3xl font-bold">lock</span>
        </div>
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-bold text-ezen-on-background">Access Denied</h2>
          <p className="text-sm text-ezen-on-surface-variant leading-relaxed">
            Super Admin privileges are required to access this panel. If you believe this is an error, please contact your system administrator.
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-ezen-primary text-white hover:bg-ezen-primary/90 rounded-xl px-6 py-2.5 text-sm font-semibold shadow-md active:scale-98 transition-all cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* ===== Page Header ===== */}
      <div>
        <h1 className="font-heading text-[40px] font-bold leading-tight text-ezen-on-background flex items-center gap-3">
          <span className="scribble-underline">Admin Panel</span>
        </h1>
        <p className="mt-2 text-base text-ezen-outline">
          Monitor service statistics and upgrade user tier access permissions.
        </p>
      </div>

      {/* ===== Stats ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {statsLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-ezen-surface-container animate-pulse rounded-2xl h-[100px]" />
          ))
        ) : (
          [
            { label: 'Total Users', value: stats?.total_users ?? 0, icon: 'group', iconColor: 'text-ezen-primary' },
            { label: 'Emails Processed', value: stats?.total_emails ?? 0, icon: 'mail', iconColor: 'text-ezen-secondary' },
            { label: 'System Errors', value: stats?.total_errors ?? 0, icon: 'warning', iconColor: 'text-ezen-error' },
          ].map(({ label, value, icon, iconColor }) => (
            <div
              key={label}
              className="bg-ezen-surface-container-lowest border border-ezen-outline-variant rounded-2xl p-6 shadow-sm flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ezen-on-surface-variant">{label}</span>
                <span className={`material-symbols-outlined ${iconColor}`} style={{ fontSize: 24 }}>
                  {icon}
                </span>
              </div>
              <p className="font-heading text-3xl font-bold text-ezen-on-surface">{value}</p>
            </div>
          ))
        )}
      </div>

      {/* ===== Users List ===== */}
      <div className="bg-ezen-surface border-2 border-ezen-outline-variant rounded-3xl p-6 shadow-[6px_6px_0_0_#d1c3ca]">
        <h2 className="font-heading text-lg font-bold text-ezen-on-surface mb-4">Registered Users ({users.length})</h2>
        <div className="overflow-hidden rounded-2xl border border-ezen-outline-variant bg-ezen-surface-container-lowest">
          {usersLoading ? (
            <div className="p-6 space-y-4 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-ezen-surface-container rounded-xl w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="p-6 text-center text-sm text-ezen-outline italic">No users found.</p>
          ) : (
            <div className="divide-y divide-ezen-outline-variant/50">
              {users.map((user: any) => {
                const form = upgradeForm[user.user_id]
                return (
                  <div key={user.user_id} className="px-6 py-4 space-y-3 hover:bg-ezen-surface-container-low/30 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ezen-on-surface truncate">{user.email ?? user.user_id}</p>
                        <p className="text-xs text-ezen-on-surface-variant mt-0.5">
                          {user.emails_used ?? 0} / {user.emails_limit ?? 50} emails processed ·{' '}
                          <span className={user.gmail_connected ? 'text-ezen-secondary font-medium' : 'text-ezen-outline'}>
                            {user.gmail_connected ? 'Gmail Connected' : 'Gmail Disconnected'}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="bg-ezen-secondary-container/20 text-ezen-secondary border border-ezen-secondary px-2.5 py-0.5 rounded-full text-xs font-bold capitalize">
                          {user.tier ?? 'free'}
                        </span>
                        <button
                          className={cn(
                            'border-2 text-xs font-bold rounded-xl px-4 py-1.5 transition-all cursor-pointer shadow-[2px_2px_0_0_#57344f] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]',
                            form
                              ? 'border-ezen-outline text-ezen-outline shadow-[2px_2px_0_0_#80747a]'
                              : 'border-ezen-primary text-ezen-primary'
                          )}
                          onClick={() => setUpgradeForm((p) =>
                            user.user_id in p
                              ? (({ [user.user_id]: _, ...rest }) => rest)(p)
                              : { ...p, [user.user_id]: { tier: user.tier ?? 'free', limit: String(user.emails_limit ?? 50) } }
                          )}
                        >
                          {form ? 'Cancel' : 'Upgrade'}
                        </button>
                      </div>
                    </div>
                    {form && (
                      <div className="flex gap-3 items-center pt-2 p-3 bg-ezen-surface-container-low rounded-xl border border-ezen-outline-variant/40 max-w-md">
                        <div className="w-28">
                          <Select
                            value={form.tier}
                            onValueChange={(v) => setUpgradeForm((p) => ({ ...p, [user.user_id]: { ...p[user.user_id], tier: v } }))}
                          >
                            <SelectTrigger className="h-8 text-xs border-2 border-ezen-outline-variant rounded-xl bg-ezen-surface-container-lowest focus:border-ezen-primary">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {['free', 'pro', 'enterprise'].map((t) => (
                                <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24">
                          <Input
                            className="h-8 text-xs border-2 border-ezen-outline-variant rounded-xl bg-ezen-surface-container-lowest focus:border-ezen-primary shadow-inner"
                            type="number"
                            value={form.limit}
                            onChange={(e) => setUpgradeForm((p) => ({ ...p, [user.user_id]: { ...p[user.user_id], limit: e.target.value } }))}
                            placeholder="Limit"
                          />
                        </div>
                        <button
                          disabled={upgrade.isPending}
                          className="bg-ezen-primary hover:bg-ezen-primary-container text-ezen-on-primary rounded-xl px-4 py-1.5 font-bold text-xs shadow-[2px_2px_0_0_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50"
                          onClick={() => upgrade.mutate({ userId: user.user_id, tier: form.tier, limit: Number(form.limit) })}
                        >
                          Save Changes
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
