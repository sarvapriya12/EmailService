'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { z } from 'zod'

// Define the validation schema using Zod
const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword']
})

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    // Check if the user has an active recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Invalid or expired password reset link.')
        router.push('/login')
      } else {
        setHasSession(true)
      }
      setCheckingSession(false)
    }
    checkSession()
  }, [router])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate inputs using Zod schema
    const validationResult = resetPasswordSchema.safeParse({ password, confirmPassword })
    
    if (!validationResult.success) {
      // Show the first validation error message to the user
      const firstError = validationResult.error.issues[0].message
      toast.error(firstError)
      return
    }
    
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Password updated successfully! Redirecting...')
        // Sign out to clear recovery session and force clean login
        await supabase.auth.signOut()
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ezen-background p-6">
        <div className="w-full max-w-md p-10 bg-ezen-surface border-2 border-ezen-outline-variant rounded-3xl text-center space-y-4">
          <div className="w-12 h-12 border-4 border-ezen-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-ezen-outline font-semibold">Verifying secure session...</p>
        </div>
      </div>
    )
  }

  if (!hasSession) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-ezen-background p-6">
      <div className="w-full max-w-md p-10 bg-ezen-surface border-2 border-ezen-outline-variant rounded-3xl shadow-[6px_6px_0_0_#d1c3ca]">
        {/* Logo and Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-ezen-primary flex items-center justify-center text-ezen-on-primary font-heading font-extrabold text-2xl shadow-[4px_4px_0_0_#ffd7f1] select-none">
            E
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-ezen-primary tracking-tight">Reset Password</h1>
          <p className="text-sm text-ezen-outline font-medium">Choose a secure new password for your account</p>
        </div>

        {/* Reset Password Form */}
        <form onSubmit={handleResetPassword} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-ezen-primary capitalize" htmlFor="password">
              new password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-4 pr-12 py-3 bg-white border-2 border-ezen-outline-variant rounded-xl text-ezen-on-background focus:outline-none focus:border-ezen-primary placeholder:text-ezen-outline/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ezen-outline hover:text-ezen-primary transition-colors flex items-center justify-center cursor-pointer select-none"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-ezen-primary capitalize" htmlFor="confirm-password">
              confirm new password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-4 pr-12 py-3 bg-white border-2 border-ezen-outline-variant rounded-xl text-ezen-on-background focus:outline-none focus:border-ezen-primary placeholder:text-ezen-outline/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ezen-outline hover:text-ezen-primary transition-colors flex items-center justify-center cursor-pointer select-none"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ezen-primary hover:bg-ezen-primary/95 text-white font-bold py-3.5 px-4 rounded-xl border-2 border-ezen-primary hover:scale-[0.99] active:scale-95 transition-all shadow-md disabled:bg-ezen-primary/50 disabled:border-ezen-primary/50 disabled:cursor-not-allowed cursor-pointer text-center capitalize"
          >
            {loading ? 'saving...' : 'save'}
          </button>
        </form>
      </div>
    </div>
  )
}
