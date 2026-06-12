'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { useState } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2,      // 2 min — don't refetch if data is fresh
        gcTime: 1000 * 60 * 10,        // 10 min — keep in cache after unmount
        refetchOnWindowFocus: false,    // don't refetch when tab regains focus
        retry: 1,
      },
    },
  }))
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}
