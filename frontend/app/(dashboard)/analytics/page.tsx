'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#006a65', '#57344f', '#5b3900', '#ba1a1a', '#79526f']

export default function AnalyticsPage() {
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api.get('/tickets').then((r) => r.data),
  })

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  })

  // Status breakdown for pie chart
  const statusCounts = tickets.reduce((acc: Record<string, number>, t: any) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1
    return acc
  }, {})
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  // Category breakdown for bar chart
  const categoryCounts = tickets.reduce((acc: Record<string, number>, t: any) => {
    const cat = t.category ?? 'uncategorized'
    acc[cat] = (acc[cat] ?? 0) + 1
    return acc
  }, {})
  const barData = Object.entries(categoryCounts)
    .map(([name, count]) => ({ name, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const emailsUsed = settings?.emails_used ?? 0
  const emailsLimit = settings?.emails_limit ?? 50

  const openCount = tickets.filter((t: any) => t.status === 'open').length
  const resolvedCount = tickets.filter((t: any) => t.status === 'resolved').length
  const emailPercent = emailsLimit > 0 ? Math.round((emailsUsed / emailsLimit) * 100) : 0

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-heading text-[40px] font-bold text-ezen-on-surface leading-tight">
          <span className="scribble-underline">Analytics</span>
        </h1>
        <p className="mt-2 text-ezen-on-surface-variant text-sm">
          Track your support performance at a glance.
        </p>
      </div>

      {isLoading ? (
        /* Loading Skeletons */
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-ezen-surface-container animate-pulse rounded-2xl h-[140px]" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="bg-ezen-surface-container animate-pulse rounded-2xl h-[360px]" />
            <div className="bg-ezen-surface-container animate-pulse rounded-2xl h-[360px]" />
          </div>
        </div>
      ) : (
        <>
          {/* ── Stat Cards (4-column bento grid) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Tickets */}
            <div className="bg-ezen-surface-container-lowest border border-ezen-outline-variant rounded-2xl p-6 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ezen-on-surface-variant">Total Tickets</span>
                <span className="material-symbols-outlined text-ezen-primary" style={{ fontSize: 28 }}>
                  confirmation_number
                </span>
              </div>
              <p className="font-heading text-[36px] font-bold text-ezen-on-surface leading-none">
                {tickets.length}
              </p>
              <span className="text-xs text-ezen-on-surface-variant">All time</span>
            </div>

            {/* Open */}
            <div className="bg-ezen-surface-container-lowest border border-ezen-outline-variant rounded-2xl p-6 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ezen-on-surface-variant">Open</span>
                <span className="material-symbols-outlined text-ezen-tertiary" style={{ fontSize: 28 }}>
                  pending_actions
                </span>
              </div>
              <p className="font-heading text-[36px] font-bold text-ezen-on-surface leading-none">
                {openCount}
              </p>
              <span className="text-xs text-ezen-on-surface-variant">
                {tickets.length > 0
                  ? `${Math.round((openCount / tickets.length) * 100)}% of total`
                  : 'No tickets yet'}
              </span>
            </div>

            {/* Resolved */}
            <div className="bg-ezen-surface-container-lowest border border-ezen-outline-variant rounded-2xl p-6 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ezen-on-surface-variant">Resolved</span>
                <span className="material-symbols-outlined text-ezen-secondary" style={{ fontSize: 28 }}>
                  check_circle
                </span>
              </div>
              <p className="font-heading text-[36px] font-bold text-ezen-secondary leading-none">
                {resolvedCount}
              </p>
              <span className="text-xs text-ezen-on-surface-variant">
                {tickets.length > 0
                  ? `${Math.round((resolvedCount / tickets.length) * 100)}% resolved`
                  : 'No tickets yet'}
              </span>
            </div>

            {/* Email Usage */}
            <div className="bg-ezen-surface-container-lowest border border-ezen-outline-variant rounded-2xl p-6 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ezen-on-surface-variant">Email Usage</span>
                <span className="material-symbols-outlined text-ezen-primary" style={{ fontSize: 28 }}>
                  mail
                </span>
              </div>
              <p className="font-heading text-[36px] font-bold text-ezen-on-surface leading-none">
                {emailsUsed}
                <span className="text-base font-medium text-ezen-on-surface-variant">/{emailsLimit}</span>
              </p>
              {/* Progress bar */}
              <div className="w-full bg-ezen-surface-dim rounded-full h-2">
                <div
                  className="bg-ezen-tertiary-fixed-dim rounded-full h-2 transition-all duration-500"
                  style={{ width: `${Math.min(emailPercent, 100)}%` }}
                />
              </div>
              <span className="text-xs text-ezen-on-surface-variant">{emailPercent}% used</span>
            </div>
          </div>

          {/* ── Chart Grid (2-column) ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Category Bar Chart */}
            <div className="bg-ezen-surface-container-lowest border border-ezen-outline-variant rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-6 pb-2">
                <h2 className="font-heading text-lg font-semibold text-ezen-on-surface">
                  Tickets by Category
                </h2>
                <button className="text-sm font-medium text-ezen-primary hover:underline">
                  View Report
                </button>
              </div>
              <div className="px-6 pb-6">
                {barData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-ezen-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-40">bar_chart</span>
                    <p className="text-sm">No data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={barData} margin={{ left: -20, top: 8 }}>
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#4e444a' }}
                        axisLine={{ stroke: '#d1c3ca' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#4e444a' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #d1c3ca',
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          fontSize: 13,
                        }}
                      />
                      <Bar dataKey="count" fill="#57344f" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Status Pie/Donut Chart */}
            <div className="bg-ezen-surface-container-lowest border border-ezen-outline-variant rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-6 pb-2">
                <h2 className="font-heading text-lg font-semibold text-ezen-on-surface">
                  Tickets by Status
                </h2>
                <button className="text-sm font-medium text-ezen-primary hover:underline">
                  View Report
                </button>
              </div>
              <div className="px-6 pb-6">
                {pieData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-ezen-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-40">donut_large</span>
                    <p className="text-sm">No data yet</p>
                  </div>
                ) : (
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend
                          iconSize={10}
                          iconType="circle"
                          wrapperStyle={{ fontSize: 13, color: '#4e444a' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #d1c3ca',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            fontSize: 13,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center text */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 32 }}>
                      <div className="text-center">
                        <p className="font-heading text-2xl font-bold text-ezen-on-surface">
                          {tickets.length}
                        </p>
                        <p className="text-xs text-ezen-on-surface-variant">Total</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
