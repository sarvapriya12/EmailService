'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import api from '@/lib/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const schema = z.object({
  type: z.enum(['whitelist', 'blacklist']),
  pattern: z.string().min(1, 'Pattern is required'),
})
type FormData = z.infer<typeof schema>

export default function FiltersPage() {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'blacklist', pattern: '' },
  })

  const { data: filters = [], isLoading } = useQuery({
    queryKey: ['filters'],
    queryFn: () => api.get('/filters').then((r) => r.data),
  })

  const create = useMutation({
    mutationFn: (data: FormData) => api.post('/filters', data),
    onSuccess: () => { toast.success('Filter added'); qc.invalidateQueries({ queryKey: ['filters'] }); reset() },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to add filter'
      toast.error(msg)
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/filters/${id}`),
    onSuccess: () => { toast.success('Filter removed'); qc.invalidateQueries({ queryKey: ['filters'] }) },
    onError: () => toast.error('Failed to remove filter'),
  })

  const whitelist = filters.filter((f: any) => f.type === 'whitelist')
  const blacklist = filters.filter((f: any) => f.type === 'blacklist')

  return (
    <div className="space-y-8 max-w-4xl">
      {/* ===== Page Header ===== */}
      <div>
        <h1 className="font-heading text-[40px] font-bold leading-tight text-ezen-on-background">
          <span className="scribble-underline">Filters</span>
        </h1>
        <p className="mt-2 text-base text-ezen-outline">
          Define patterns to automatically whitelist or blacklist email addresses and domains.
        </p>
      </div>

      {/* ===== Add Filter Card ===== */}
      <div className="bg-ezen-surface border-2 border-ezen-outline-variant rounded-3xl p-6 shadow-[4px_4px_0_0_#d1c3ca]">
        <h2 className="font-heading text-lg font-bold text-ezen-on-surface mb-4">Add Filter</h2>
        <form onSubmit={handleSubmit((data) => create.mutate(data))} className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="w-full sm:w-40">
            <Select defaultValue="blacklist" onValueChange={(v) => setValue('type', v as 'whitelist' | 'blacklist')}>
              <SelectTrigger className="w-full border-2 border-ezen-outline-variant rounded-xl shadow-[2px_2px_0_0_#80747a] focus:shadow-none focus:border-ezen-primary bg-ezen-surface-container-lowest">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whitelist">Whitelist</SelectItem>
                <SelectItem value="blacklist">Blacklist</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Input
              {...register('pattern')}
              placeholder="email@example.com or *@domain.com"
              className="w-full border-2 border-ezen-outline-variant rounded-xl focus:border-ezen-primary bg-ezen-surface-container-lowest shadow-inner"
            />
            {errors.pattern && <p className="text-xs text-ezen-error mt-1">{errors.pattern.message}</p>}
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="bg-ezen-primary hover:bg-ezen-primary-container text-ezen-on-primary rounded-xl px-5 py-2.5 font-semibold text-sm shadow-[3px_3px_0_0_#000000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">add</span> Add
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="bg-ezen-surface-container animate-pulse rounded-3xl h-48" />
          <div className="bg-ezen-surface-container animate-pulse rounded-3xl h-48" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {/* ===== Whitelist Card ===== */}
          <div className="bg-ezen-surface border-2 border-ezen-outline-variant rounded-3xl p-6 shadow-[6px_6px_0_0_#d1c3ca]">
            <h3 className="font-heading text-lg font-bold text-ezen-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-ezen-secondary">verified</span>
              Whitelist ({whitelist.length})
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {whitelist.length === 0 ? (
                <p className="text-sm text-ezen-outline italic py-4">No whitelist entries.</p>
              ) : whitelist.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-ezen-surface-container-low transition-colors">
                  <span className="bg-ezen-secondary-container/20 text-ezen-secondary border-2 border-ezen-secondary px-3 py-1 rounded-full text-xs font-semibold shadow-[2px_2px_0_0_#006a65] truncate max-w-[200px]">
                    {f.pattern}
                  </span>
                  <button
                    onClick={() => remove.mutate(f.id)}
                    disabled={remove.isPending}
                    className="text-ezen-error hover:bg-ezen-error-container/50 rounded-xl p-1.5 flex items-center justify-center transition-colors disabled:opacity-50"
                    title="Remove filter"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ===== Blacklist Card ===== */}
          <div className="bg-ezen-surface border-2 border-ezen-outline-variant rounded-3xl p-6 shadow-[6px_6px_0_0_#d1c3ca]">
            <h3 className="font-heading text-lg font-bold text-ezen-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-ezen-error">block</span>
              Blacklist ({blacklist.length})
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {blacklist.length === 0 ? (
                <p className="text-sm text-ezen-outline italic py-4">No blacklist entries.</p>
              ) : blacklist.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-ezen-surface-container-low transition-colors">
                  <span className="bg-ezen-error-container text-ezen-on-error-container border-2 border-ezen-error px-3 py-1 rounded-full text-xs font-semibold shadow-[2px_2px_0_0_#ba1a1a] truncate max-w-[200px]">
                    {f.pattern}
                  </span>
                  <button
                    onClick={() => remove.mutate(f.id)}
                    disabled={remove.isPending}
                    className="text-ezen-error hover:bg-ezen-error-container/50 rounded-xl p-1.5 flex items-center justify-center transition-colors disabled:opacity-50"
                    title="Remove filter"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
